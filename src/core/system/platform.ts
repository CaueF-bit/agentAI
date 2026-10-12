import type { Db } from "@/db/client";
import { audit } from "../audit";

// Ações do OPERADOR da plataforma. O operador não lê documentos, mensagens ou credenciais
// dos clientes: só contadores agregados, catálogo, interruptor global e auditoria.

export async function setKillSwitch(db: Db, operatorUserId: string, enabled: boolean, reason: string) {
  await db.asSystem(async (tx) => {
    await tx.query(
      `insert into platform_settings (key, value, updated_at) values ('kill_switch', $1, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [JSON.stringify({ enabled, reason: reason.slice(0, 200) })],
    );
    await audit(tx, { orgId: null, actorUserId: operatorUserId, action: enabled ? "operator.kill_switch.on" : "operator.kill_switch.off", metadata: { reason } });
  });
}

export async function getKillSwitch(db: Db): Promise<{ enabled: boolean; reason: string | null }> {
  return db.asSystem(async (tx) => {
    const r = await tx.query<{ value: { enabled: boolean; reason?: string } }>(`select value from platform_settings where key = 'kill_switch'`);
    return { enabled: !!r.rows[0]?.value.enabled, reason: r.rows[0]?.value.reason ?? null };
  });
}

export async function operatorOverview(db: Db) {
  return db.asSystem(async (tx) => {
    const r = await tx.query<{ org: string; installations: number; runs_month: number; failed_month: number; cost_month_cents: number }>(
      `select o.name as org,
              (select count(*)::int from installations i where i.org_id = o.id) as installations,
              (select count(*)::int from runs r where r.org_id = o.id and r.created_at > now() - interval '30 days') as runs_month,
              (select count(*)::int from runs r where r.org_id = o.id and r.status in ('failed', 'budget_blocked') and r.created_at > now() - interval '30 days') as failed_month,
              (select coalesce(sum(cost_cents), 0)::int from usage_events u where u.org_id = o.id and u.created_at > now() - interval '30 days') as cost_month_cents
         from organizations o where o.is_buyer order by o.name`,
    );
    return r.rows;
  });
}

export async function listAudit(db: Db, limit = 50) {
  return db.asSystem(async (tx) => {
    const r = await tx.query<{ id: number; org: string | null; actor: string | null; action: string; target: string | null; metadata: unknown; created_at: string }>(
      `select a.id, o.name as org, u.name as actor, a.action, a.target, a.metadata, a.created_at
         from audit_log a left join organizations o on o.id = a.org_id left join users u on u.id = a.actor_user_id
        order by a.id desc limit $1`,
      [limit],
    );
    return r.rows;
  });
}
