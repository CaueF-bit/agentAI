import type { Db, TenantScope, Tx } from "@/db/client";
import type { DocType } from "../agents/spec";
import { reserve, settle } from "../budget/budget";
import { canonicalJson, newId, sha256 } from "../ids";
import { redactValue } from "../security/redact";
import type { ChannelAdapter } from "./channels";
import { dispatchMessage, type Sleep } from "./dispatch";
import type { ClientInfo, DocInfo, ReminderState, RunEnvironment, SendParams, SendResult } from "./engine";

/** Implementação das portas do motor sobre o banco, sempre no escopo da organização (RLS). */
export class DbRunEnvironment implements RunEnvironment {
  private seq = 0;

  constructor(
    private readonly db: Db,
    private readonly scope: TenantScope,
    private readonly ids: { installationId: string; runId: string; competence: string; period: string },
    private readonly channel: ChannelAdapter,
    private readonly sleep?: Sleep,
  ) {}

  private t<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.asTenant(this.scope, fn);
  }

  checkRunnable() {
    return this.t(async (tx) => {
      const r = await tx.query<{ status: string; killed: boolean }>(
        `select i.status, platform_kill_switch() as killed from installations i where i.id = $1`,
        [this.ids.installationId],
      );
      const row = r.rows[0];
      if (!row) return "paused" as const;
      if (row.killed) return "kill_switch" as const;
      return row.status === "paused" ? ("paused" as const) : null;
    });
  }

  listClients(): Promise<ClientInfo[]> {
    return this.t(async (tx) => {
      const r = await tx.query<{ id: string; name: string; tax_regime: ClientInfo["taxRegime"]; contact_email: string | null; contact_phone: string | null }>(
        `select id, name, tax_regime, contact_email, contact_phone from client_companies order by name`,
      );
      return r.rows.map((c) => ({ id: c.id, name: c.name, taxRegime: c.tax_regime, contactEmail: c.contact_email, contactPhone: c.contact_phone }));
    });
  }

  listDocuments(clientId: string): Promise<DocInfo[]> {
    return this.t(async (tx) => {
      const r = await tx.query<{ id: string; filename: string; content_text: string; classified_type: DocType | null }>(
        `select id, filename, content_text, classified_type from documents where client_company_id = $1 and competence = $2 order by received_at`,
        [clientId, this.ids.competence],
      );
      return r.rows.map((d) => ({ id: d.id, filename: d.filename, content: d.content_text, classifiedType: d.classified_type }));
    });
  }

  async saveClassification(docId: string, docType: DocType) {
    await this.t((tx) => tx.query(`update documents set classified_type = $1, classified_by_run = $2 where id = $3`, [docType, this.ids.runId, docId]));
  }

  reminderState(clientId: string): Promise<ReminderState> {
    return this.t(async (tx) => {
      const m = await tx.query<{ n: number; last: string | null }>(
        `select count(*)::int as n, max(created_at)::text as last from outbound_messages
          where installation_id = $1 and client_company_id = $2 and competence = $3`,
        [this.ids.installationId, clientId, this.ids.competence],
      );
      const a = await tx.query<{ pending: number; rejected: number }>(
        `select count(*) filter (where status in ('pending', 'approved'))::int as pending,
                count(*) filter (where status = 'rejected')::int as rejected
           from approvals where installation_id = $1 and params->>'clientCompanyId' = $2 and params->>'competence' = $3`,
        [this.ids.installationId, clientId, this.ids.competence],
      );
      return {
        // Cada número de lembrete é consumido uma única vez (enviado, falho ou rejeitado).
        sentCount: m.rows[0].n + a.rows[0].rejected,
        lastSentAt: m.rows[0].last ? new Date(m.rows[0].last).getTime() : null,
        pendingApproval: a.rows[0].pending > 0,
      };
    });
  }

  reserveBudget(cents: number) {
    return this.t((tx) => reserve(tx, this.ids.installationId, this.ids.period, cents));
  }

  settleBudget(reservedCents: number, actualCents: number, usage: { kind: "model" | "channel"; detail: string }) {
    return this.t(async (tx) => {
      const { charged, overrun } = await settle(tx, this.ids.installationId, this.ids.period, reservedCents, actualCents);
      await tx.query(
        `insert into usage_events (id, org_id, installation_id, run_id, kind, detail, cost_cents) values ($1, $2, $3, $4, $5, $6, $7)`,
        [newId("use"), this.scope.orgId, this.ids.installationId, this.ids.runId, usage.kind, overrun ? `${usage.detail} (excedeu estimativa em ${overrun}c)` : usage.detail, charged],
      );
      await tx.query(`update runs set cost_cents = cost_cents + $1 where id = $2`, [charged, this.ids.runId]);
      return charged;
    });
  }

  async requestApproval(p: SendParams) {
    await this.t((tx) =>
      tx.query(
        `insert into approvals (id, org_id, installation_id, run_id, action, idempotency_key, params, params_hash, status)
         values ($1, $2, $3, $4, 'messages.send', $5, $6, $7, 'pending') on conflict (installation_id, idempotency_key) do nothing`,
        [newId("apr"), this.scope.orgId, this.ids.installationId, this.ids.runId, p.idempotencyKey, JSON.stringify(p), sha256(canonicalJson(p))],
      ),
    );
  }

  sendMessage(p: SendParams): Promise<SendResult> {
    return dispatchMessage(this.db, this.scope, this.ids.installationId, p, this.channel, this.sleep);
  }

  async recordStep(tool: string, status: "ok" | "denied" | "error", detail: Record<string, unknown>) {
    const seq = ++this.seq;
    await this.t((tx) =>
      tx.query(`insert into run_steps (id, org_id, run_id, seq, tool, status, detail) values ($1, $2, $3, $4, $5, $6, $7)`, [
        newId("stp"),
        this.scope.orgId,
        this.ids.runId,
        seq,
        tool,
        status,
        JSON.stringify(redactValue(detail)),
      ]),
    );
  }
}
