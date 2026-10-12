import type { Db } from "@/db/client";
import { assertBuyerOrg, assertRole, tenantScope, type Actor } from "../auth/actor";
import { TAX_REGIMES, type TaxRegime } from "../agents/spec";
import { AppError } from "../errors";
import { newId } from "../ids";

// Empresas-cliente e documentos do escritório (dados privados do comprador).
// No MVP os documentos são texto já extraído (upload simulado); OCR está fora do escopo.

export interface ClientRow {
  id: string;
  name: string;
  tax_regime: TaxRegime;
  contact_email: string | null;
  contact_phone: string | null;
}

export interface DocumentRow {
  id: string;
  client_company_id: string;
  competence: string;
  filename: string;
  content_text: string;
  classified_type: string | null;
  received_at: string;
}

export async function listClients(db: Db, actor: Actor): Promise<ClientRow[]> {
  assertBuyerOrg(actor);
  return db.asTenant(tenantScope(actor), async (tx) => {
    const r = await tx.query<ClientRow>(`select id, name, tax_regime, contact_email, contact_phone from client_companies where org_id = $1 order by name`, [actor.orgId]);
    return r.rows;
  });
}

export async function addClient(db: Db, actor: Actor, input: { name: string; taxRegime: string; contactEmail?: string; contactPhone?: string }) {
  assertBuyerOrg(actor);
  assertRole(actor, "member");
  const name = input.name.trim();
  if (name.length < 2 || name.length > 120) throw new AppError("validation", "Nome com 2 a 120 caracteres.");
  if (!TAX_REGIMES.includes(input.taxRegime as TaxRegime)) throw new AppError("validation", "Regime inválido.");
  const email = input.contactEmail?.trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError("validation", "E-mail inválido.");
  const id = newId("cli");
  await db.asTenant(tenantScope(actor), (tx) =>
    tx.query(
      `insert into client_companies (id, org_id, name, tax_regime, contact_email, contact_phone) values ($1, $2, $3, $4, $5, $6)`,
      [id, actor.orgId, name, input.taxRegime, email, input.contactPhone?.trim() || null],
    ),
  );
  return id;
}

export async function addDocument(db: Db, actor: Actor, input: { clientCompanyId: string; competence: string; filename: string; content: string }) {
  assertBuyerOrg(actor);
  assertRole(actor, "member");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.competence)) throw new AppError("validation", "Competência no formato AAAA-MM.");
  const filename = input.filename.trim();
  if (!/^[\w .()\-áéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ]{3,120}$/.test(filename)) throw new AppError("validation", "Nome de arquivo inválido.");
  if (input.content.length > 20_000) throw new AppError("validation", "Conteúdo acima de 20 mil caracteres.");
  const id = newId("doc");
  await db.asTenant(tenantScope(actor), async (tx) => {
    // Garante que a empresa-cliente é da própria organização (além do RLS).
    const own = await tx.query(`select 1 from client_companies where id = $1 and org_id = $2`, [input.clientCompanyId, actor.orgId]);
    if (!own.rows.length) throw new AppError("not_found");
    await tx.query(
      `insert into documents (id, org_id, client_company_id, competence, filename, content_text) values ($1, $2, $3, $4, $5, $6)`,
      [id, actor.orgId, input.clientCompanyId, input.competence, filename, input.content],
    );
  });
  return id;
}

export async function listDocuments(db: Db, actor: Actor, competence: string): Promise<(DocumentRow & { client_name: string })[]> {
  assertBuyerOrg(actor);
  return db.asTenant(tenantScope(actor), async (tx) => {
    const r = await tx.query<DocumentRow & { client_name: string }>(
      `select d.*, c.name as client_name from documents d join client_companies c on c.id = d.client_company_id
        where d.org_id = $1 and d.competence = $2 order by c.name, d.filename`,
      [actor.orgId, competence],
    );
    return r.rows;
  });
}
