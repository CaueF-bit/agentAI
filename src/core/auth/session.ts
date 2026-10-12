import type { Db } from "@/db/client";
import { getConfig } from "../config";
import { AppError } from "../errors";
import { randomToken, sha256 } from "../ids";
import type { Actor, Role } from "./actor";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/**
 * Login de DEMONSTRAÇÃO: entra como uma persona fictícia, sem senha.
 * Bloqueado fora de DEMO_MODE. Produção exige autenticação consolidada (docs/decisions.md D-006).
 * O token é opaco e aleatório; só o hash SHA-256 fica no banco.
 */
export async function createDemoSession(db: Db, userId: string): Promise<string> {
  if (!getConfig().demoMode) throw new AppError("demo_disabled");
  const token = randomToken();
  await db.asSystem(async (tx) => {
    const m = await tx.query<{ org_id: string }>(
      `select m.org_id from memberships m where m.user_id = $1 and m.revoked_at is null order by m.created_at limit 1`,
      [userId],
    );
    const u = await tx.query<{ is_platform_admin: boolean }>("select is_platform_admin from users where id = $1", [userId]);
    if (!u.rows[0]) throw new AppError("not_found");
    await tx.query(
      `insert into sessions (token_hash, user_id, active_org_id, expires_at) values ($1, $2, $3, $4)`,
      [sha256(token), userId, m.rows[0]?.org_id ?? null, new Date(Date.now() + SESSION_TTL_MS)],
    );
  });
  return token;
}

export async function revokeSession(db: Db, token: string): Promise<void> {
  await db.asSystem((tx) => tx.query("update sessions set revoked_at = now() where token_hash = $1", [sha256(token)]));
}

interface SessionRow {
  user_id: string;
  user_name: string;
  is_platform_admin: boolean;
  active_org_id: string | null;
}

interface MembershipRow {
  org_id: string;
  org_name: string;
  role: Role;
  is_creator: boolean;
  is_buyer: boolean;
}

export interface SessionInfo {
  userId: string;
  userName: string;
  isPlatformAdmin: boolean;
  activeOrgId: string | null;
  memberships: MembershipRow[];
}

/** Resolve a sessão e as filiações ATIVAS a cada chamada (revogação vale imediatamente). */
export async function resolveSession(db: Db, token: string | undefined | null): Promise<SessionInfo | null> {
  if (!token) return null;
  return db.asSystem(async (tx) => {
    const s = await tx.query<SessionRow>(
      `select s.user_id, u.name as user_name, u.is_platform_admin, s.active_org_id
         from sessions s join users u on u.id = s.user_id
        where s.token_hash = $1 and s.revoked_at is null and s.expires_at > now()`,
      [sha256(token)],
    );
    const row = s.rows[0];
    if (!row) return null;
    const m = await tx.query<MembershipRow>(
      `select m.org_id, o.name as org_name, m.role, o.is_creator, o.is_buyer
         from memberships m join organizations o on o.id = m.org_id
        where m.user_id = $1 and m.revoked_at is null
        order by o.name`,
      [row.user_id],
    );
    return {
      userId: row.user_id,
      userName: row.user_name,
      isPlatformAdmin: row.is_platform_admin,
      activeOrgId: row.active_org_id,
      memberships: m.rows,
    };
  });
}

/**
 * Exige usuário autenticado com filiação ativa na organização ativa.
 * O orgId vem da sessão no servidor, nunca de um campo enviado pelo navegador.
 */
export async function requireActor(db: Db, token: string | undefined | null): Promise<Actor> {
  const s = await resolveSession(db, token);
  if (!s) throw new AppError("unauthenticated");
  const m = s.memberships.find((x) => x.org_id === s.activeOrgId) ?? null;
  if (!m) throw new AppError("forbidden", "Você não tem acesso ativo a nenhuma organização.");
  return {
    userId: s.userId,
    userName: s.userName,
    orgId: m.org_id,
    orgName: m.org_name,
    role: m.role,
    orgIsCreator: m.is_creator,
    orgIsBuyer: m.is_buyer,
    isPlatformAdmin: s.isPlatformAdmin,
  };
}

/** Troca a organização ativa; só para organizações com filiação ativa. */
export async function switchOrg(db: Db, token: string, orgId: string): Promise<void> {
  const s = await resolveSession(db, token);
  if (!s) throw new AppError("unauthenticated");
  if (!s.memberships.some((m) => m.org_id === orgId)) throw new AppError("forbidden");
  await db.asSystem((tx) => tx.query("update sessions set active_org_id = $1 where token_hash = $2", [orgId, sha256(token)]));
}

/** Operador da plataforma: exige flag no usuário (no banco), não papel na organização. */
export async function requirePlatformAdmin(db: Db, token: string | undefined | null): Promise<{ userId: string }> {
  const s = await resolveSession(db, token);
  if (!s) throw new AppError("unauthenticated");
  if (!s.isPlatformAdmin) throw new AppError("forbidden");
  return { userId: s.userId };
}

export async function listDemoPersonas(db: Db) {
  if (!getConfig().demoMode) return [];
  return db.asSystem(async (tx) => {
    const r = await tx.query<{ id: string; name: string; email: string; is_platform_admin: boolean; orgs: string | null }>(
      `select u.id, u.name, u.email, u.is_platform_admin,
              string_agg(o.name || ' (' || m.role || ')', ', ' order by o.name) as orgs
         from users u
         left join memberships m on m.user_id = u.id and m.revoked_at is null
         left join organizations o on o.id = m.org_id
        group by u.id order by u.is_platform_admin, u.name`,
    );
    return r.rows;
  });
}
