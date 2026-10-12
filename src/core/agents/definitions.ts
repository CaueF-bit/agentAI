import type { Db } from "@/db/client";
import { assertCreatorOrg, assertRole, tenantScope, type Actor } from "../auth/actor";
import { audit } from "../audit";
import { ensureStandardPlans } from "../catalog/catalog";
import { AppError } from "../errors";
import { canonicalJson, newId, sha256 } from "../ids";
import { validateSpec, type AgentSpec } from "./spec";

export function specHash(spec: AgentSpec): string {
  return sha256(canonicalJson(spec));
}

export interface DefinitionRow {
  id: string;
  name: string;
  draft_spec: AgentSpec;
  draft_updated_at: string;
  created_at: string;
}

export interface VersionRow {
  id: string;
  definition_id: string;
  version: number;
  spec: AgentSpec;
  spec_hash: string;
  published_at: string;
}

function mustBeValid(raw: unknown): AgentSpec {
  const v = validateSpec(raw);
  if (!v.ok) throw new AppError("validation", "Especificação inválida.", v.issues);
  return v.spec;
}

export async function createDefinition(db: Db, actor: Actor, rawSpec: unknown): Promise<string> {
  assertCreatorOrg(actor);
  assertRole(actor, "admin");
  const spec = mustBeValid(rawSpec);
  const id = newId("def");
  await db.asTenant(tenantScope(actor), async (tx) => {
    await tx.query(
      `insert into agent_definitions (id, org_id, name, draft_spec, created_by) values ($1, $2, $3, $4, $5)`,
      [id, actor.orgId, spec.name, JSON.stringify(spec), actor.userId],
    );
    await audit(tx, { orgId: actor.orgId, actorUserId: actor.userId, action: "agent.create", target: id });
  });
  return id;
}

export async function updateDraft(db: Db, actor: Actor, definitionId: string, rawSpec: unknown): Promise<void> {
  assertCreatorOrg(actor);
  assertRole(actor, "admin");
  const spec = mustBeValid(rawSpec);
  await db.asTenant(tenantScope(actor), async (tx) => {
    const r = await tx.query(
      `update agent_definitions set draft_spec = $1, name = $2, draft_updated_at = now()
        where id = $3 and org_id = $4`,
      [JSON.stringify(spec), spec.name, definitionId, actor.orgId],
    );
    if (!r.affectedRows) throw new AppError("not_found");
  });
}

/** Publica o rascunho atual como nova versão imutável e atualiza o anúncio do catálogo. */
export async function publishVersion(db: Db, actor: Actor, definitionId: string): Promise<VersionRow> {
  assertCreatorOrg(actor);
  assertRole(actor, "admin");
  const published = await db.asTenant(tenantScope(actor), async (tx) => {
    const d = await tx.query<DefinitionRow>(`select * from agent_definitions where id = $1 and org_id = $2`, [definitionId, actor.orgId]);
    const def = d.rows[0];
    if (!def) throw new AppError("not_found");
    const spec = mustBeValid(def.draft_spec);
    const hash = specHash(spec);

    const last = await tx.query<{ version: number; spec_hash: string }>(
      `select version, spec_hash from agent_versions where definition_id = $1 order by version desc limit 1`,
      [definitionId],
    );
    if (last.rows[0]?.spec_hash === hash) throw new AppError("conflict", "Nada mudou desde a última versão publicada.");
    const version = (last.rows[0]?.version ?? 0) + 1;
    const id = newId("ver");
    await tx.query(
      `insert into agent_versions (id, org_id, definition_id, version, spec, spec_hash, published_by)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [id, actor.orgId, definitionId, version, JSON.stringify(spec), hash, actor.userId],
    );

    const listing = await tx.query<{ id: string }>(`select id from catalog_listings where definition_id = $1`, [definitionId]);
    let listingId = listing.rows[0]?.id;
    if (listingId) {
      await tx.query(
        `update catalog_listings set latest_version_id = $1, title = $2, summary = $3, updated_at = now() where id = $4`,
        [id, spec.name, spec.summary, listingId],
      );
    } else {
      listingId = newId("lst");
      const slug = `${spec.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${listingId.slice(-6)}`;
      await tx.query(
        `insert into catalog_listings (id, org_id, definition_id, slug, title, summary, latest_version_id, is_fictitious)
         values ($1, $2, $3, $4, $5, $6, $7, true)`,
        [listingId, actor.orgId, definitionId, slug, spec.name, spec.summary, id],
      );
    }
    await audit(tx, { orgId: actor.orgId, actorUserId: actor.userId, action: "agent.publish", target: id, metadata: { version, hash } });
    const v = await tx.query<VersionRow>(`select * from agent_versions where id = $1`, [id]);
    return { version: v.rows[0], listingId };
  });
  // Planos são definidos pela plataforma (preço no servidor), nunca pelo criador ou navegador.
  await ensureStandardPlans(db, published.listingId);
  return published.version;
}

export async function listDefinitions(db: Db, actor: Actor) {
  assertCreatorOrg(actor);
  return db.asTenant(tenantScope(actor), async (tx) => {
    const r = await tx.query<DefinitionRow & { latest_version: number | null; listing_slug: string | null }>(
      `select d.*, (select max(version) from agent_versions v where v.definition_id = d.id) as latest_version,
              (select slug from catalog_listings l where l.definition_id = d.id) as listing_slug
         from agent_definitions d where d.org_id = $1 order by d.created_at desc`,
      [actor.orgId],
    );
    return r.rows;
  });
}

export async function getDefinition(db: Db, actor: Actor, definitionId: string) {
  assertCreatorOrg(actor);
  return db.asTenant(tenantScope(actor), async (tx) => {
    const d = await tx.query<DefinitionRow>(`select * from agent_definitions where id = $1 and org_id = $2`, [definitionId, actor.orgId]);
    if (!d.rows[0]) throw new AppError("not_found");
    const v = await tx.query<VersionRow>(
      `select * from agent_versions where definition_id = $1 and org_id = $2 order by version desc`,
      [definitionId, actor.orgId],
    );
    return { definition: d.rows[0], versions: v.rows };
  });
}
