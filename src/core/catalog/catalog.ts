import type { Db } from "@/db/client";
import type { AgentSpec } from "../agents/spec";
import { audit } from "../audit";
import { AppError } from "../errors";
import { newId } from "../ids";

/**
 * Planos padrão definidos pela PLATAFORMA (hipótese de preço em docs/business/pricing.md).
 * Valores em centavos de BRL. O navegador nunca envia preço: só o código do plano.
 */
export const PLAN_TEMPLATES = [
  { code: "essencial", name: "Essencial", monthlyPriceCents: 69_000, includedClientCompanies: 80, maxMonthlyBudgetCents: 15_000, maxConcurrentRuns: 1 },
  { code: "profissional", name: "Profissional", monthlyPriceCents: 149_000, includedClientCompanies: 250, maxMonthlyBudgetCents: 40_000, maxConcurrentRuns: 3 },
] as const;

export async function ensureStandardPlans(db: Db, listingId: string): Promise<void> {
  await db.asSystem(async (tx) => {
    for (const p of PLAN_TEMPLATES) {
      await tx.query(
        `insert into plans (id, listing_id, code, name, monthly_price_cents, included_client_companies, max_monthly_budget_cents, max_concurrent_runs)
         values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict (listing_id, code) do nothing`,
        [newId("pln"), listingId, p.code, p.name, p.monthlyPriceCents, p.includedClientCompanies, p.maxMonthlyBudgetCents, p.maxConcurrentRuns],
      );
    }
  });
}

export interface ListingSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  creator_name: string;
  is_fictitious: boolean;
  version: number;
  min_price_cents: number | null;
}

export interface PlanRow {
  id: string;
  code: string;
  name: string;
  monthly_price_cents: number;
  included_client_companies: number;
  max_monthly_budget_cents: number;
  max_concurrent_runs: number;
}

/** Catálogo público: só anúncios listados. Leitura de sistema, sem dados privados de clientes. */
export async function listCatalog(db: Db): Promise<ListingSummary[]> {
  return db.asSystem(async (tx) => {
    const r = await tx.query<ListingSummary>(
      `select l.id, l.slug, l.title, l.summary, o.name as creator_name, l.is_fictitious, v.version,
              (select min(monthly_price_cents) from plans p where p.listing_id = l.id) as min_price_cents
         from catalog_listings l
         join organizations o on o.id = l.org_id
         join agent_versions v on v.id = l.latest_version_id
        where l.status = 'listed'
        order by l.created_at`,
    );
    return r.rows;
  });
}

export async function getListingBySlug(db: Db, slug: string) {
  return db.asSystem(async (tx) => {
    const r = await tx.query<ListingSummary & { spec: AgentSpec; status: string }>(
      `select l.id, l.slug, l.title, l.summary, o.name as creator_name, l.is_fictitious, l.status, v.version, v.spec
         from catalog_listings l
         join organizations o on o.id = l.org_id
         join agent_versions v on v.id = l.latest_version_id
        where l.slug = $1 and l.status = 'listed'`,
      [slug],
    );
    const listing = r.rows[0];
    if (!listing) throw new AppError("not_found");
    const plans = await tx.query<PlanRow>(`select * from plans where listing_id = $1 order by monthly_price_cents`, [listing.id]);
    return { listing, plans: plans.rows };
  });
}

/** Operador: retira um anúncio do catálogo. Não dá acesso a dados de compradores. */
export async function setListingStatus(db: Db, operatorUserId: string, listingId: string, status: "listed" | "unlisted") {
  await db.asSystem(async (tx) => {
    const r = await tx.query(`update catalog_listings set status = $1, updated_at = now() where id = $2`, [status, listingId]);
    if (!r.affectedRows) throw new AppError("not_found");
    await audit(tx, { orgId: null, actorUserId: operatorUserId, action: `operator.listing.${status}`, target: listingId });
  });
}

export async function listAllListingsForOperator(db: Db) {
  return db.asSystem(async (tx) => {
    const r = await tx.query<{ id: string; slug: string; title: string; status: string; creator_name: string; installs: number }>(
      `select l.id, l.slug, l.title, l.status, o.name as creator_name,
              (select count(*)::int from installations i where i.listing_id = l.id) as installs
         from catalog_listings l join organizations o on o.id = l.org_id order by l.created_at`,
    );
    return r.rows;
  });
}
