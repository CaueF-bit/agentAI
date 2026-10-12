import type { Db } from "@/db/client";
import { assertRole, type Actor } from "../auth/actor";
import { audit } from "../audit";
import { AppError } from "../errors";

// Filiações ficam fora do RLS (tabela de sistema); toda consulta aqui filtra pela
// organização do ator resolvida no servidor.

export async function listMembers(db: Db, actor: Actor) {
  return db.asSystem(async (tx) => {
    const r = await tx.query<{ user_id: string; name: string; email: string; role: string; revoked_at: string | null }>(
      `select m.user_id, u.name, u.email, m.role, m.revoked_at from memberships m join users u on u.id = m.user_id
        where m.org_id = $1 order by m.revoked_at nulls first, u.name`,
      [actor.orgId],
    );
    return r.rows;
  });
}

/** Revoga acesso: vale na próxima requisição do usuário (a sessão revalida a filiação sempre). */
export async function revokeMember(db: Db, actor: Actor, userId: string) {
  assertRole(actor, "admin");
  if (userId === actor.userId) throw new AppError("validation", "Você não pode revogar o próprio acesso.");
  await db.asSystem(async (tx) => {
    const r = await tx.query<{ role: string }>(`select role from memberships where org_id = $1 and user_id = $2 and revoked_at is null`, [actor.orgId, userId]);
    const target = r.rows[0];
    if (!target) throw new AppError("not_found");
    if (target.role === "owner" && actor.role !== "owner") throw new AppError("forbidden");
    await tx.query(`update memberships set revoked_at = now() where org_id = $1 and user_id = $2`, [actor.orgId, userId]);
    await audit(tx, { orgId: actor.orgId, actorUserId: actor.userId, action: "member.revoke", target: userId });
  });
}
