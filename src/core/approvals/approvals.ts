import type { Db } from "@/db/client";
import { assertBuyerOrg, assertRole, tenantScope, type Actor } from "../auth/actor";
import { audit } from "../audit";
import { TOOLS } from "../agents/tools";
import { periodOf, reserve, settle } from "../budget/budget";
import { AppError } from "../errors";
import { canonicalJson, newId, sha256 } from "../ids";
import type { ChannelAdapter } from "../runtime/channels";
import { dispatchMessage, type Sleep } from "../runtime/dispatch";
import type { SendParams } from "../runtime/engine";

export interface ApprovalRow {
  id: string;
  installation_id: string;
  run_id: string;
  action: string;
  idempotency_key: string;
  params: SendParams;
  params_hash: string;
  status: string;
  requested_at: string;
}

export async function listPendingApprovals(db: Db, actor: Actor, installationId?: string): Promise<ApprovalRow[]> {
  assertBuyerOrg(actor);
  return db.asTenant(tenantScope(actor), async (tx) => {
    const r = await tx.query<ApprovalRow>(
      `select id, installation_id, run_id, action, idempotency_key, params, params_hash, status, requested_at
         from approvals where org_id = $1 and status = 'pending' and ($2::text is null or installation_id = $2)
        order by requested_at`,
      [actor.orgId, installationId ?? null],
    );
    return r.rows;
  });
}

/**
 * Decisão humana sobre uma ação. A aprovação vale para EXATAMENTE a ação e os parâmetros
 * exibidos: o formulário devolve o hash que a pessoa viu; se os parâmetros armazenados
 * não corresponderem a esse hash, nada é executado.
 */
export async function decideApproval(
  db: Db,
  actor: Actor,
  approvalId: string,
  decision: "approve" | "reject",
  shownParamsHash: string,
  deps: { channel: ChannelAdapter; sleep?: Sleep },
): Promise<"rejected" | "executed" | "failed"> {
  assertBuyerOrg(actor);
  assertRole(actor, "admin");
  const scope = tenantScope(actor);

  const approval = await db.asTenant(scope, async (tx) => {
    const r = await tx.query<ApprovalRow & { inst_status: string; killed: boolean }>(
      `select a.*, i.status as inst_status, platform_kill_switch() as killed
         from approvals a join installations i on i.id = a.installation_id
        where a.id = $1 and a.org_id = $2 for update of a`,
      [approvalId, actor.orgId],
    );
    const a = r.rows[0];
    if (!a) throw new AppError("not_found");
    if (a.status !== "pending") throw new AppError("conflict", "Esta aprovação já foi decidida.");
    const recomputed = sha256(canonicalJson(a.params));
    if (recomputed !== a.params_hash || shownParamsHash !== a.params_hash) {
      throw new AppError("conflict", "Os parâmetros da ação mudaram desde que foram exibidos. Recarregue a página.");
    }
    if (decision === "reject") {
      await tx.query(`update approvals set status = 'rejected', decided_by = $1, decided_at = now() where id = $2`, [actor.userId, approvalId]);
      await audit(tx, { orgId: actor.orgId, actorUserId: actor.userId, action: "approval.reject", target: approvalId });
      return null;
    }
    if (a.killed) throw new AppError("paused", "Execuções interrompidas pela plataforma.");
    if (a.inst_status !== "active") throw new AppError("paused");
    await tx.query(`update approvals set status = 'approved', decided_by = $1, decided_at = now() where id = $2`, [actor.userId, approvalId]);
    await audit(tx, { orgId: actor.orgId, actorUserId: actor.userId, action: "approval.approve", target: approvalId, metadata: { key: a.idempotency_key } });
    return a;
  });
  if (!approval) return "rejected";

  const cost = TOOLS["messages.send"].estimatedCostCents;
  const period = periodOf();
  const reserved = await db.asTenant(scope, (tx) => reserve(tx, approval.installation_id, period, cost));
  if (!reserved) {
    await db.asTenant(scope, (tx) => tx.query(`update approvals set status = 'failed' where id = $1`, [approvalId]));
    throw new AppError("budget_exceeded");
  }
  const result = await dispatchMessage(db, scope, approval.installation_id, approval.params, deps.channel, deps.sleep);
  const charged = result === "sent" ? cost : 0;
  await db.asTenant(scope, async (tx) => {
    await settle(tx, approval.installation_id, period, cost, charged);
    if (charged) {
      await tx.query(
        `insert into usage_events (id, org_id, installation_id, run_id, kind, detail, cost_cents) values ($1, $2, $3, $4, 'channel', 'messages.send:approved', $5)`,
        [newId("use"), actor.orgId, approval.installation_id, approval.run_id, charged],
      );
    }
    await tx.query(`update approvals set status = $1 where id = $2`, [result === "failed" ? "failed" : "executed", approvalId]);
  });
  return result === "failed" ? "failed" : "executed";
}
