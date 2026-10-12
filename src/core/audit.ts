import type { Tx } from "@/db/client";
import { redactValue } from "./security/redact";

/** Registra ação administrativa relevante. Metadados passam pela redação de segredos. */
export async function audit(
  tx: Tx,
  entry: { orgId: string | null; actorUserId: string | null; action: string; target?: string; metadata?: unknown },
): Promise<void> {
  await tx.query(
    `insert into audit_log (org_id, actor_user_id, action, target, metadata) values ($1, $2, $3, $4, $5)`,
    [entry.orgId, entry.actorUserId, entry.action, entry.target ?? null, JSON.stringify(redactValue(entry.metadata ?? {}))],
  );
}
