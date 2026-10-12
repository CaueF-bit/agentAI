import type { Db } from "@/db/client";
import type { ModelProvider } from "../ai/provider";
import { assertBuyerOrg, assertRole, tenantScope, type Actor } from "../auth/actor";
import type { AgentSpec } from "../agents/spec";
import { ensurePeriod, periodOf } from "../budget/budget";
import { AppError } from "../errors";
import { currentCompetence, newId } from "../ids";
import type { ChannelAdapter } from "./channels";
import { DbRunEnvironment } from "./db-environment";
import type { Sleep } from "./dispatch";
import { runMonthlyCollection, type RunSummary } from "./engine";

export interface RunDeps {
  provider: ModelProvider;
  channel: ChannelAdapter;
  pricingModel: string;
  now?: () => number;
  sleep?: Sleep;
}

export interface RunRow {
  id: string;
  installation_id: string;
  version_id: string;
  competence: string;
  trigger: string;
  idempotency_key: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled" | "budget_blocked";
  steps_used: number;
  tool_calls_used: number;
  cost_cents: number;
  summary: RunSummary | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

/** Cria execução (idempotente pela chave). Membro do escritório pode disparar. */
export async function createRun(
  db: Db,
  actor: Actor,
  installationId: string,
  opts: { idempotencyKey: string; competence?: string; trigger?: "manual" | "schedule" },
): Promise<string> {
  assertBuyerOrg(actor);
  assertRole(actor, "member");
  const competence = opts.competence ?? currentCompetence();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)) throw new AppError("validation", "Competência inválida.");
  if (!/^[\w:.-]{8,120}$/.test(opts.idempotencyKey)) throw new AppError("validation", "Chave de idempotência inválida.");
  return db.asTenant(tenantScope(actor), async (tx) => {
    const inst = await tx.query<{ version_id: string }>(`select version_id from installations where id = $1 and org_id = $2`, [installationId, actor.orgId]);
    if (!inst.rows[0]) throw new AppError("not_found");
    await tx.query(
      `insert into runs (id, org_id, installation_id, version_id, competence, trigger, idempotency_key, status, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, 'queued', $8) on conflict (installation_id, idempotency_key) do nothing`,
      [newId("run"), actor.orgId, installationId, inst.rows[0].version_id, competence, opts.trigger ?? "manual", opts.idempotencyKey, actor.userId],
    );
    const r = await tx.query<{ id: string }>(`select id from runs where installation_id = $1 and idempotency_key = $2`, [installationId, opts.idempotencyKey]);
    return r.rows[0].id;
  });
}

type StartDecision =
  | { ok: true; spec: AgentSpec; approvalPolicy: "always" | "first_contact" | "never"; competence: string; installationId: string }
  | { ok: false };

/**
 * Executa uma execução enfileirada. A transição queued→running é atômica e verifica, com a
 * linha da instalação bloqueada: pausa, interruptor global, assinatura ativa e limite de
 * execuções simultâneas. Uma execução nunca roda duas vezes.
 */
export async function executeRun(db: Db, actor: Actor, runId: string, deps: RunDeps): Promise<RunRow> {
  assertBuyerOrg(actor);
  const scope = tenantScope(actor);
  const decision: StartDecision = await db.asTenant(scope, async (tx) => {
    const r = await tx.query<{ status: string; installation_id: string; version_id: string; competence: string }>(
      `select status, installation_id, version_id, competence from runs where id = $1 and org_id = $2`,
      [runId, actor.orgId],
    );
    const run = r.rows[0];
    if (!run) throw new AppError("not_found");
    if (run.status !== "queued") return { ok: false };

    const i = await tx.query<{ status: string; max_concurrent_runs: number; approval_policy: "always" | "first_contact" | "never"; monthly_budget_cents: number; killed: boolean }>(
      `select status, max_concurrent_runs, approval_policy, monthly_budget_cents, platform_kill_switch() as killed
         from installations where id = $1 for update`,
      [run.installation_id],
    );
    const inst = i.rows[0];
    const sub = await tx.query<{ status: string }>(`select status from subscriptions where installation_id = $1`, [run.installation_id]);
    const running = await tx.query<{ n: number }>(`select count(*)::int as n from runs where installation_id = $1 and status = 'running'`, [run.installation_id]);

    const reject = async (status: "cancelled" | "failed", code: string, message: string) => {
      await tx.query(`update runs set status = $1, error_code = $2, error_message = $3, finished_at = now() where id = $4`, [status, code, message, runId]);
      return { ok: false } as const;
    };
    if (inst.killed) return reject("cancelled", "kill_switch", "Execuções interrompidas pela plataforma.");
    if (inst.status !== "active") return reject("cancelled", "paused", "Agente pausado.");
    if (sub.rows[0]?.status !== "active") return reject("failed", "subscription_inactive", "Assinatura não está ativa.");
    if (running.rows[0].n >= inst.max_concurrent_runs) return reject("cancelled", "concurrency_limit", "Limite de execuções simultâneas atingido.");

    const v = await tx.query<{ spec: AgentSpec }>(`select spec from agent_versions where id = $1`, [run.version_id]);
    await ensurePeriod(tx, actor.orgId, run.installation_id, periodOf(), inst.monthly_budget_cents);
    await tx.query(`update runs set status = 'running', started_at = now() where id = $1 and status = 'queued'`, [runId]);
    return { ok: true, spec: v.rows[0].spec, approvalPolicy: inst.approval_policy, competence: run.competence, installationId: run.installation_id };
  });

  if (decision.ok) {
    const env = new DbRunEnvironment(
      db,
      scope,
      { installationId: decision.installationId, runId, competence: decision.competence, period: periodOf() },
      deps.channel,
      deps.sleep,
    );
    const outcome = await runMonthlyCollection({
      spec: decision.spec,
      competence: decision.competence,
      firmName: actor.orgName,
      approvalPolicy: decision.approvalPolicy,
      provider: deps.provider,
      env,
      pricingModel: deps.pricingModel,
      now: deps.now,
    });
    await db.asTenant(scope, (tx) =>
      tx.query(
        `update runs set status = $1, error_code = $2, error_message = $3, steps_used = $4, tool_calls_used = $5,
                summary = $6, finished_at = now() where id = $7`,
        [outcome.status, outcome.errorCode, outcome.errorMessage, outcome.steps, outcome.toolCalls, JSON.stringify(outcome.summary), runId],
      ),
    );
  }
  return getRunRow(db, actor, runId);
}

export async function getRunRow(db: Db, actor: Actor, runId: string): Promise<RunRow> {
  return db.asTenant(tenantScope(actor), async (tx) => {
    const r = await tx.query<RunRow>(`select * from runs where id = $1 and org_id = $2`, [runId, actor.orgId]);
    if (!r.rows[0]) throw new AppError("not_found");
    return r.rows[0];
  });
}

export async function getRunDetail(db: Db, actor: Actor, runId: string) {
  assertBuyerOrg(actor);
  return db.asTenant(tenantScope(actor), async (tx) => {
    const r = await tx.query<RunRow>(`select * from runs where id = $1 and org_id = $2`, [runId, actor.orgId]);
    const run = r.rows[0];
    if (!run) throw new AppError("not_found");
    const steps = await tx.query<{ seq: number; tool: string; status: string; detail: Record<string, unknown>; created_at: string }>(
      `select seq, tool, status, detail, created_at from run_steps where run_id = $1 order by seq`,
      [runId],
    );
    const approvals = await tx.query<{ id: string; status: string; params: Record<string, unknown> }>(
      `select id, status, params from approvals where run_id = $1 order by requested_at`,
      [runId],
    );
    return { run, steps: steps.rows, approvals: approvals.rows };
  });
}

export async function listRuns(db: Db, actor: Actor, installationId: string, limit = 20) {
  assertBuyerOrg(actor);
  return db.asTenant(tenantScope(actor), async (tx) => {
    const r = await tx.query<RunRow>(
      `select * from runs where installation_id = $1 and org_id = $2 order by created_at desc limit $3`,
      [installationId, actor.orgId, limit],
    );
    return r.rows;
  });
}

export async function listMessages(db: Db, actor: Actor, installationId: string) {
  assertBuyerOrg(actor);
  return db.asTenant(tenantScope(actor), async (tx) => {
    const r = await tx.query<{ id: string; client_name: string; channel: string; status: string; attempts: number; body: string; created_at: string; sent_at: string | null; last_error: string | null }>(
      `select m.id, c.name as client_name, m.channel, m.status, m.attempts, m.body, m.created_at, m.sent_at, m.last_error
         from outbound_messages m join client_companies c on c.id = m.client_company_id
        where m.installation_id = $1 and m.org_id = $2 order by m.created_at desc limit 50`,
      [installationId, actor.orgId],
    );
    return r.rows;
  });
}

export async function usageForInstallation(db: Db, actor: Actor, installationId: string) {
  assertBuyerOrg(actor);
  return db.asTenant(tenantScope(actor), async (tx) => {
    const r = await tx.query<{ kind: string; calls: number; cost_cents: number }>(
      `select kind, count(*)::int as calls, coalesce(sum(cost_cents), 0)::int as cost_cents
         from usage_events where installation_id = $1 and org_id = $2 and to_char(created_at, 'YYYY-MM') = $3 group by kind order by kind`,
      [installationId, actor.orgId, periodOf()],
    );
    return r.rows;
  });
}
