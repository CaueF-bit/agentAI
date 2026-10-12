import type { Db } from "@/db/client";
import { assertBuyerOrg, assertRole, tenantScope, type Actor } from "../auth/actor";
import { audit } from "../audit";
import { ensurePeriod, periodOf } from "../budget/budget";
import type { AgentSpec } from "../agents/spec";
import { AppError } from "../errors";
import { newId } from "../ids";
import { last4, seal } from "../security/crypto";

export interface InstallationRow {
  id: string;
  org_id: string;
  listing_id: string;
  version_id: string;
  plan_id: string;
  status: "active" | "paused";
  monthly_budget_cents: number;
  max_concurrent_runs: number;
  approval_policy: "always" | "first_contact" | "never";
  created_at: string;
  paused_at: string | null;
}

export type ApprovalPolicy = InstallationRow["approval_policy"];

/**
 * Contratação em MODO DE TESTE. O navegador envia apenas o anúncio e o código do plano;
 * preço, limites e versão vêm do servidor. A assinatura nasce "pending" e só é ativada
 * por evento de pagamento assinado (src/core/billing/billing.ts).
 */
export async function contractListing(db: Db, actor: Actor, listingId: string, planCode: string): Promise<string> {
  assertBuyerOrg(actor);
  assertRole(actor, "admin");
  const { listing, plan } = await db.asSystem(async (tx) => {
    const l = await tx.query<{ id: string; latest_version_id: string; spec: AgentSpec }>(
      `select l.id, l.latest_version_id, v.spec from catalog_listings l join agent_versions v on v.id = l.latest_version_id
        where l.id = $1 and l.status = 'listed'`,
      [listingId],
    );
    if (!l.rows[0]) throw new AppError("not_found");
    const p = await tx.query<{ id: string; monthly_price_cents: number; max_monthly_budget_cents: number; max_concurrent_runs: number }>(
      `select id, monthly_price_cents, max_monthly_budget_cents, max_concurrent_runs from plans where listing_id = $1 and code = $2`,
      [listingId, planCode],
    );
    if (!p.rows[0]) throw new AppError("validation", "Plano inexistente.");
    return { listing: l.rows[0], plan: p.rows[0] };
  });

  const id = newId("ins");
  await db.asTenant(tenantScope(actor), async (tx) => {
    const defaultBudget = Math.floor(plan.max_monthly_budget_cents / 2);
    await tx.query(
      `insert into installations (id, org_id, listing_id, version_id, plan_id, status, monthly_budget_cents, max_concurrent_runs, approval_policy, created_by)
       values ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9)`,
      [id, actor.orgId, listing.id, listing.latest_version_id, plan.id, defaultBudget, plan.max_concurrent_runs, listing.spec.approvals.sendMessages, actor.userId],
    );
    await tx.query(
      `insert into subscriptions (id, org_id, installation_id, plan_id, price_cents, status, mode, provider_ref)
       values ($1, $2, $3, $4, $5, 'pending', 'test', $6)`,
      [newId("sub"), actor.orgId, id, plan.id, plan.monthly_price_cents, newId("tp_sub")],
    );
    await ensurePeriod(tx, actor.orgId, id, periodOf(), defaultBudget);
    await audit(tx, { orgId: actor.orgId, actorUserId: actor.userId, action: "installation.contract", target: id, metadata: { planCode } });
  });
  return id;
}

export async function listInstallations(db: Db, actor: Actor) {
  assertBuyerOrg(actor);
  return db.asTenant(tenantScope(actor), async (tx) => {
    const r = await tx.query<InstallationRow & { title: string; version: number; subscription_status: string; plan_name: string }>(
      `select i.*, l.title, v.version, s.status as subscription_status, p.name as plan_name
         from installations i
         join catalog_listings l on l.id = i.listing_id
         join agent_versions v on v.id = i.version_id
         join plans p on p.id = i.plan_id
         left join subscriptions s on s.installation_id = i.id
        where i.org_id = $1 order by i.created_at`,
      [actor.orgId],
    );
    return r.rows;
  });
}

/** Detalhe da instalação. Retorna "não encontrado" para recursos de outra organização. */
export async function getInstallation(db: Db, actor: Actor, installationId: string) {
  assertBuyerOrg(actor);
  return db.asTenant(tenantScope(actor), async (tx) => {
    const r = await tx.query<
      InstallationRow & { title: string; version: number; spec: AgentSpec; latest_version_id: string; latest_version: number; plan_name: string; plan_max_budget: number; plan_max_concurrency: number; plan_price: number }
    >(
      `select i.*, l.title, l.latest_version_id, v.version, v.spec, lv.version as latest_version,
              p.name as plan_name, p.max_monthly_budget_cents as plan_max_budget, p.max_concurrent_runs as plan_max_concurrency,
              p.monthly_price_cents as plan_price
         from installations i
         join catalog_listings l on l.id = i.listing_id
         join agent_versions v on v.id = i.version_id
         left join agent_versions lv on lv.id = l.latest_version_id
         join plans p on p.id = i.plan_id
        where i.id = $1 and i.org_id = $2`,
      [installationId, actor.orgId],
    );
    const inst = r.rows[0];
    if (!inst) throw new AppError("not_found");
    const sub = await tx.query<{ status: string; price_cents: number; provider_ref: string; mode: string }>(
      `select status, price_cents, provider_ref, mode from subscriptions where installation_id = $1`,
      [installationId],
    );
    const conns = await tx.query<{ id: string; kind: string; label: string; secret_last4: string; created_at: string }>(
      `select id, kind, label, secret_last4, created_at from connections where installation_id = $1 order by kind`,
      [installationId],
    );
    const period = periodOf();
    await ensurePeriod(tx, actor.orgId, installationId, period, inst.monthly_budget_cents);
    const b = await tx.query<{ limit_cents: number; spent_cents: number; reserved_cents: number }>(
      `select limit_cents, spent_cents, reserved_cents from budget_periods where installation_id = $1 and period = $2`,
      [installationId, period],
    );
    return { installation: inst, subscription: sub.rows[0] ?? null, connections: conns.rows, budget: { period, ...b.rows[0] } };
  });
}

export async function updateLimits(
  db: Db,
  actor: Actor,
  installationId: string,
  input: { monthlyBudgetCents: number; maxConcurrentRuns: number; approvalPolicy: ApprovalPolicy },
) {
  assertBuyerOrg(actor);
  assertRole(actor, "admin");
  if (!Number.isInteger(input.monthlyBudgetCents) || input.monthlyBudgetCents < 100) throw new AppError("validation", "Orçamento mínimo de R$ 1,00.");
  if (!Number.isInteger(input.maxConcurrentRuns) || input.maxConcurrentRuns < 1) throw new AppError("validation", "Concorrência inválida.");
  if (!["always", "first_contact", "never"].includes(input.approvalPolicy)) throw new AppError("validation", "Política inválida.");
  await db.asTenant(tenantScope(actor), async (tx) => {
    const r = await tx.query<{ plan_max_budget: number; plan_max_concurrency: number }>(
      `select p.max_monthly_budget_cents as plan_max_budget, p.max_concurrent_runs as plan_max_concurrency
         from installations i join plans p on p.id = i.plan_id where i.id = $1 and i.org_id = $2`,
      [installationId, actor.orgId],
    );
    const lim = r.rows[0];
    if (!lim) throw new AppError("not_found");
    if (input.monthlyBudgetCents > lim.plan_max_budget) throw new AppError("validation", "Orçamento acima do teto do plano.");
    if (input.maxConcurrentRuns > lim.plan_max_concurrency) throw new AppError("validation", "Concorrência acima do teto do plano.");
    const period = periodOf();
    const b = await tx.query<{ spent_cents: number; reserved_cents: number }>(
      `select spent_cents, reserved_cents from budget_periods where installation_id = $1 and period = $2`,
      [installationId, period],
    );
    const used = (b.rows[0]?.spent_cents ?? 0) + (b.rows[0]?.reserved_cents ?? 0);
    if (input.monthlyBudgetCents < used) throw new AppError("validation", "Orçamento menor que o já consumido no período.");
    await tx.query(
      `update installations set monthly_budget_cents = $1, max_concurrent_runs = $2, approval_policy = $3 where id = $4`,
      [input.monthlyBudgetCents, input.maxConcurrentRuns, input.approvalPolicy, installationId],
    );
    await ensurePeriod(tx, actor.orgId, installationId, period, input.monthlyBudgetCents);
    await tx.query(`update budget_periods set limit_cents = $1 where installation_id = $2 and period = $3`, [
      input.monthlyBudgetCents,
      installationId,
      period,
    ]);
    await audit(tx, { orgId: actor.orgId, actorUserId: actor.userId, action: "installation.limits", target: installationId, metadata: input });
  });
}

export async function setPaused(db: Db, actor: Actor, installationId: string, paused: boolean) {
  assertBuyerOrg(actor);
  assertRole(actor, "admin");
  await db.asTenant(tenantScope(actor), async (tx) => {
    const r = await tx.query(
      paused
        ? `update installations set status = 'paused', paused_at = now(), paused_by = $3 where id = $1 and org_id = $2`
        : `update installations set status = 'active', paused_at = null, paused_by = null where id = $1 and org_id = $2 and $3::text is not null`,
      [installationId, actor.orgId, actor.userId],
    );
    if (!r.affectedRows) throw new AppError("not_found");
    await audit(tx, { orgId: actor.orgId, actorUserId: actor.userId, action: paused ? "installation.pause" : "installation.resume", target: installationId });
  });
}

/** Troca explícita para a versão mais recente (nunca acontece silenciosamente). */
export async function upgradeToLatest(db: Db, actor: Actor, installationId: string) {
  assertBuyerOrg(actor);
  assertRole(actor, "admin");
  await db.asTenant(tenantScope(actor), async (tx) => {
    const r = await tx.query<{ latest: string; current: string }>(
      `select l.latest_version_id as latest, i.version_id as current from installations i join catalog_listings l on l.id = i.listing_id
        where i.id = $1 and i.org_id = $2`,
      [installationId, actor.orgId],
    );
    const row = r.rows[0];
    if (!row) throw new AppError("not_found");
    if (row.latest === row.current) return;
    await tx.query(`update installations set version_id = $1 where id = $2`, [row.latest, installationId]);
    await audit(tx, { orgId: actor.orgId, actorUserId: actor.userId, action: "installation.upgrade", target: installationId, metadata: { from: row.current, to: row.latest } });
  });
}

/** Credencial da instalação: cifrada com chave fora do banco; só os 4 últimos caracteres voltam à interface. */
export async function setConnection(
  db: Db,
  actor: Actor,
  installationId: string,
  input: { kind: "email" | "whatsapp"; label: string; secret: string },
) {
  assertBuyerOrg(actor);
  assertRole(actor, "admin");
  if (!["email", "whatsapp"].includes(input.kind)) throw new AppError("validation", "Canal inválido.");
  const label = input.label.trim();
  if (label.length < 3 || label.length > 80) throw new AppError("validation", "Nome da conexão com 3 a 80 caracteres.");
  if (input.secret.length < 8 || input.secret.length > 500) throw new AppError("validation", "Credencial com 8 a 500 caracteres.");
  const sealed = seal(input.secret, installationId);
  await db.asTenant(tenantScope(actor), async (tx) => {
    const own = await tx.query(`select 1 from installations where id = $1 and org_id = $2`, [installationId, actor.orgId]);
    if (!own.rows.length) throw new AppError("not_found");
    await tx.query(
      `insert into connections (id, org_id, installation_id, kind, label, secret_ciphertext, secret_iv, secret_tag, secret_last4, key_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       on conflict (installation_id, kind) do update set label = excluded.label, secret_ciphertext = excluded.secret_ciphertext,
         secret_iv = excluded.secret_iv, secret_tag = excluded.secret_tag, secret_last4 = excluded.secret_last4, key_id = excluded.key_id`,
      [newId("con"), actor.orgId, installationId, input.kind, label, sealed.ciphertext, sealed.iv, sealed.tag, last4(input.secret), sealed.keyId],
    );
    await audit(tx, { orgId: actor.orgId, actorUserId: actor.userId, action: "connection.set", target: installationId, metadata: { kind: input.kind, label } });
  });
}
