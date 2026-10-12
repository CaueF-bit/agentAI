"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireActor, createDemoSession, requirePlatformAdmin, revokeSession, switchOrg } from "@/core/auth/session";
import { buildFromDescription } from "@/core/agents/builder";
import { createDefinition, getDefinition, publishVersion, updateDraft } from "@/core/agents/definitions";
import type { AgentSpec, SpecIssue } from "@/core/agents/spec";
import { decideApproval } from "@/core/approvals/approvals";
import { simulateTestPayment } from "@/core/billing/billing";
import { setListingStatus } from "@/core/catalog/catalog";
import { addClient, addDocument } from "@/core/clients/clients";
import { contractListing, setConnection, setPaused, updateLimits, upgradeToLatest, type ApprovalPolicy } from "@/core/installations/installations";
import { revokeMember } from "@/core/orgs/members";
import { createRun, executeRun } from "@/core/runtime/runs";
import { runSandbox, type SandboxResult } from "@/core/runtime/sandbox";
import { setKillSwitch } from "@/core/system/platform";
import { getModelProvider } from "@/core/ai";
import { toPublicError } from "@/core/http";
import { AppError } from "@/core/errors";
import { currentCompetence } from "@/core/ids";
import { getChannel, getDb, runDeps, SESSION_COOKIE, sessionToken } from "@/lib/server/context";

// Toda ação resolve a identidade pela SESSÃO no servidor. Nenhum campo de formulário define
// organização, papel, preço ou permissão.

const str = (f: FormData, k: string) => String(f.get(k) ?? "");

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

/** Executa, e redireciona com mensagem de sucesso ou erro seguro. */
async function guarded(back: string, fn: () => Promise<string | void>, okMessage?: string): Promise<never> {
  let target: string;
  try {
    const r = await fn();
    target = r ?? (okMessage ? withParam(back, "ok", okMessage) : back);
  } catch (e) {
    const p = toPublicError(e);
    target = withParam(back, "erro", p.errorId ? `${p.message} (${p.errorId.slice(0, 8)})` : p.message);
  }
  redirect(target);
}

async function actor() {
  return requireActor(await getDb(), await sessionToken());
}

// --- Sessão (demo) ---------------------------------------------------------

export async function loginAction(formData: FormData) {
  const db = await getDb();
  const token = await createDemoSession(db, str(formData, "userId"));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 8 * 3600 });
  const s = await requirePlatformAdmin(db, token).catch(() => null);
  redirect(s ? "/operador" : "/painel");
}

export async function logoutAction() {
  const token = await sessionToken();
  if (token) await revokeSession(await getDb(), token);
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function switchOrgAction(formData: FormData) {
  const token = await sessionToken();
  if (!token) redirect("/login");
  await guarded("/painel", async () => {
    await switchOrg(await getDb(), token, str(formData, "orgId"));
  });
}

// --- Catálogo / contratação --------------------------------------------------

export async function contractAction(formData: FormData) {
  const slug = str(formData, "slug");
  await guarded(`/catalogo/${slug}`, async () => {
    const id = await contractListing(await getDb(), await actor(), str(formData, "listingId"), str(formData, "planCode"));
    return withParam(`/painel/instalacoes/${id}`, "ok", "Contratação criada em modo de teste. Simule o pagamento para ativar.");
  });
}

// --- Criador -----------------------------------------------------------------

export interface BuilderState {
  description: string;
  spec: AgentSpec | null;
  questions: string[];
  issues: SpecIssue[];
  simulated: boolean;
  error?: string;
}

export async function builderGenerateAction(_prev: BuilderState, formData: FormData): Promise<BuilderState> {
  const description = str(formData, "description");
  try {
    await actor();
    const r = await buildFromDescription(getModelProvider(), description);
    return r.ok
      ? { description, spec: r.spec, questions: r.questions, issues: [], simulated: r.simulated }
      : { description, spec: null, questions: r.questions, issues: r.issues, simulated: r.simulated };
  } catch (e) {
    return { description, spec: null, questions: [], issues: [], simulated: true, error: toPublicError(e).message };
  }
}

function parseSpecJson(formData: FormData): unknown {
  try {
    return JSON.parse(str(formData, "spec"));
  } catch {
    throw new AppError("validation", "Especificação malformada.");
  }
}

export async function createDefinitionAction(formData: FormData) {
  await guarded("/criador/novo", async () => {
    const id = await createDefinition(await getDb(), await actor(), parseSpecJson(formData));
    return withParam(`/criador/agentes/${id}`, "ok", "Rascunho salvo. Teste no sandbox e publique quando estiver pronto.");
  });
}

export async function saveDraftAction(formData: FormData) {
  const id = str(formData, "definitionId");
  await guarded(`/criador/agentes/${id}`, async () => {
    await updateDraft(await getDb(), await actor(), id, parseSpecJson(formData));
  }, "Rascunho atualizado. Versões publicadas não mudaram.");
}

export async function publishAction(formData: FormData) {
  const id = str(formData, "definitionId");
  await guarded(`/criador/agentes/${id}`, async () => {
    const v = await publishVersion(await getDb(), await actor(), id);
    return withParam(`/criador/agentes/${id}`, "ok", `Versão ${v.version} publicada no catálogo (exemplo fictício).`);
  });
}

export interface SandboxState {
  result: SandboxResult | null;
  error?: string;
}

export async function sandboxAction(_prev: SandboxState, formData: FormData): Promise<SandboxState> {
  try {
    const a = await actor();
    const { definition } = await getDefinition(await getDb(), a, str(formData, "definitionId"));
    const result = await runSandbox(definition.draft_spec, getModelProvider(), a.orgName, currentCompetence());
    return { result };
  } catch (e) {
    return { result: null, error: toPublicError(e).message };
  }
}

// --- Comprador ---------------------------------------------------------------

const insPath = (f: FormData) => `/painel/instalacoes/${str(f, "installationId")}`;

export async function simulatePaymentAction(formData: FormData) {
  await guarded(insPath(formData), async () => {
    await simulateTestPayment(await getDb(), await actor(), str(formData, "installationId"));
  }, "Pagamento simulado confirmado por evento assinado (modo teste).");
}

export async function updateLimitsAction(formData: FormData) {
  await guarded(insPath(formData), async () => {
    const reais = Number(str(formData, "budgetReais").replace(",", "."));
    await updateLimits(await getDb(), await actor(), str(formData, "installationId"), {
      monthlyBudgetCents: Math.round(reais * 100),
      maxConcurrentRuns: Number(str(formData, "maxConcurrentRuns")),
      approvalPolicy: str(formData, "approvalPolicy") as ApprovalPolicy,
    });
  }, "Limites atualizados.");
}

export async function pauseAction(formData: FormData) {
  const pause = str(formData, "pause") === "1";
  await guarded(insPath(formData), async () => {
    await setPaused(await getDb(), await actor(), str(formData, "installationId"), pause);
  }, pause ? "Agente pausado. Execuções em andamento param no próximo passo." : "Agente retomado.");
}

export async function upgradeAction(formData: FormData) {
  await guarded(insPath(formData), async () => {
    await upgradeToLatest(await getDb(), await actor(), str(formData, "installationId"));
  }, "Instalação atualizada para a versão mais recente.");
}

export async function connectionAction(formData: FormData) {
  await guarded(insPath(formData), async () => {
    await setConnection(await getDb(), await actor(), str(formData, "installationId"), {
      kind: str(formData, "kind") as "email" | "whatsapp",
      label: str(formData, "label"),
      secret: str(formData, "secret"),
    });
  }, "Conexão salva. A credencial foi cifrada e não será exibida novamente.");
}

export async function runNowAction(formData: FormData) {
  await guarded(insPath(formData), async () => {
    const db = await getDb();
    const a = await actor();
    const runId = await createRun(db, a, str(formData, "installationId"), { idempotencyKey: str(formData, "idempotencyKey") });
    await executeRun(db, a, runId, runDeps());
    return `/painel/execucoes/${runId}`;
  });
}

export async function decideApprovalAction(formData: FormData) {
  const decision = str(formData, "decision") === "approve" ? "approve" : "reject";
  await guarded(insPath(formData), async () => {
    const r = await decideApproval(await getDb(), await actor(), str(formData, "approvalId"), decision, str(formData, "paramsHash"), { channel: getChannel() });
    return withParam(insPath(formData), "ok", r === "executed" ? "Mensagem aprovada e enviada (canal simulado)." : r === "rejected" ? "Mensagem rejeitada." : "Envio falhou após as tentativas permitidas.");
  });
}

export async function addClientAction(formData: FormData) {
  await guarded("/painel/clientes", async () => {
    await addClient(await getDb(), await actor(), {
      name: str(formData, "name"),
      taxRegime: str(formData, "taxRegime"),
      contactEmail: str(formData, "contactEmail"),
      contactPhone: str(formData, "contactPhone"),
    });
  }, "Empresa-cliente cadastrada.");
}

export async function addDocumentAction(formData: FormData) {
  await guarded("/painel/clientes", async () => {
    await addDocument(await getDb(), await actor(), {
      clientCompanyId: str(formData, "clientCompanyId"),
      competence: str(formData, "competence"),
      filename: str(formData, "filename"),
      content: str(formData, "content"),
    });
  }, "Documento recebido (upload simulado).");
}

export async function revokeMemberAction(formData: FormData) {
  await guarded("/painel/equipe", async () => {
    await revokeMember(await getDb(), await actor(), str(formData, "userId"));
  }, "Acesso revogado. Vale a partir da próxima ação da pessoa.");
}

// --- Operador ----------------------------------------------------------------

export async function killSwitchAction(formData: FormData) {
  await guarded("/operador", async () => {
    const db = await getDb();
    const op = await requirePlatformAdmin(db, await sessionToken());
    await setKillSwitch(db, op.userId, str(formData, "enabled") === "1", str(formData, "reason") || "sem motivo informado");
  }, "Interruptor global atualizado.");
}

export async function listingStatusAction(formData: FormData) {
  await guarded("/operador", async () => {
    const db = await getDb();
    const op = await requirePlatformAdmin(db, await sessionToken());
    await setListingStatus(db, op.userId, str(formData, "listingId"), str(formData, "status") === "listed" ? "listed" : "unlisted");
  }, "Catálogo atualizado.");
}
