import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { buildFromDescription } from "@/core/agents/builder";
import { createDefinition, getDefinition, listDefinitions, publishVersion, updateDraft } from "@/core/agents/definitions";
import { defaultSpec, PLATFORM_LIMITS, validateSpec } from "@/core/agents/spec";
import type { ModelProvider } from "@/core/ai/provider";
import { MockProvider } from "@/core/ai/mock-provider";
import { contractListing, getInstallation, upgradeToLatest } from "@/core/installations/installations";
import { listCatalog } from "@/core/catalog/catalog";
import { expectAppError, freshDb, loginAs, U } from "./helpers";

// Categoria: criação, validação, versionamento e instalação de agentes.

/** Provedor que devolve exatamente a saída fornecida (simula um modelo errando/manipulado). */
function fixedProvider(output: unknown, opts: { throws?: boolean } = {}): ModelProvider {
  const usage = { model: "fixed", inputTokens: 10, outputTokens: 10 };
  return {
    id: "mock",
    simulated: true,
    generateSpec: async () => {
      if (opts.throws) throw new Error("timeout do modelo");
      return { output, usage };
    },
    classifyDocument: async () => ({ output, usage }),
    draftReminder: async () => ({ output, usage }),
  };
}

const withSpec = (patch: (s: Record<string, unknown>) => void) => {
  const s = structuredClone(defaultSpec()) as unknown as Record<string, unknown>;
  patch(s);
  return { spec: s, questions: [] };
};

let db: Db;
beforeAll(async () => {
  db = await freshDb();
});

describe("IA construtora", () => {
  it("AGT-01 descrição incompleta gera especificação válida e perguntas sobre o que falta", async () => {
    const r = await buildFromDescription(new MockProvider(), "Quero cobrar o extrato bancário e as notas de saída dos meus clientes todo mês.");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.checklist.map((c) => c.docType).sort()).toEqual(["extrato_bancario", "nota_fiscal_saida"]);
    expect(r.questions.join(" ")).toMatch(/canal/);
    expect(r.questions.join(" ")).toMatch(/Até que dia/);
    expect(r.questions.join(" ")).toMatch(/aprovação/);
    expect(r.simulated).toBe(true);
  });

  it("AGT-02 descrição completa preenche prazo, canal, intervalo, limite e aprovação", async () => {
    const r = await buildFromDescription(
      new MockProvider(),
      "Cobrar folha e notas de entrada até o dia 12 pelo WhatsApp, a cada 2 dias, no máximo 4 lembretes, tom formal, com aprovação antes de enviar.",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.schedule.deadlineDay).toBe(12);
    expect(r.spec.reminders).toMatchObject({ channel: "whatsapp", intervalDays: 2, maxPerClient: 4, tone: "formal" });
    expect(r.spec.approvals.sendMessages).toBe("always");
    expect(r.questions).toHaveLength(0);
  });

  it("AGT-03 especificação da IA com ferramenta fora da lista permitida é rejeitada", async () => {
    const r = await buildFromDescription(fixedProvider(withSpec((s) => ((s.tools as string[]).push("admin.grant_role")))), "descrição qualquer com mais de vinte caracteres");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issues.some((i) => i.path.startsWith("tools"))).toBe(true);
  });

  it("AGT-04 especificação da IA com campos não previstos (preço, permissões) é rejeitada", async () => {
    for (const extra of [{ price: 0 }, { permissions: ["billing.write"] }, { role: "owner" }]) {
      const r = await buildFromDescription(fixedProvider(withSpec((s) => Object.assign(s, extra))), "descrição qualquer com mais de vinte caracteres");
      expect(r.ok).toBe(false);
    }
  });

  it("AGT-05 especificação da IA acima dos tetos da plataforma é rejeitada", async () => {
    const tooBig = withSpec((s) => ((s.limits as Record<string, number>).maxCostCentsPerRun = PLATFORM_LIMITS.maxCostCentsPerRun + 1));
    expect((await buildFromDescription(fixedProvider(tooBig), "descrição qualquer com mais de vinte caracteres")).ok).toBe(false);
    const manyReminders = withSpec((s) => ((s.reminders as Record<string, number>).maxPerClient = 50));
    expect((await buildFromDescription(fixedProvider(manyReminders), "descrição qualquer com mais de vinte caracteres")).ok).toBe(false);
  });

  it("AGT-06 saída fora do formato ou falha do modelo não gera especificação", async () => {
    expect((await buildFromDescription(fixedProvider("ok, aqui está o agente!"), "descrição qualquer com mais de vinte caracteres")).ok).toBe(false);
    expect((await buildFromDescription(fixedProvider(null, { throws: true }), "descrição qualquer com mais de vinte caracteres")).ok).toBe(false);
    await expectAppError(buildFromDescription(new MockProvider(), "curta"), "validation");
  });
});

describe("validação determinística da especificação", () => {
  it("AGT-07 regras do fluxo: ferramentas obrigatórias e envio exigido quando há lembretes", () => {
    const s = defaultSpec();
    const noClassify = { ...s, tools: s.tools.filter((t) => t !== "documents.classify") };
    expect(validateSpec(noClassify).ok).toBe(false);
    const noSend = { ...s, tools: s.tools.filter((t) => t !== "messages.send") };
    expect(validateSpec(noSend).ok).toBe(false);
    expect(validateSpec({ ...noSend, reminders: { ...s.reminders, maxPerClient: 0 } }).ok).toBe(true);
  });

  it("AGT-08 prazo antes do início, chaves repetidas e nenhum item obrigatório são rejeitados", () => {
    const s = defaultSpec();
    expect(validateSpec({ ...s, schedule: { startDay: 15, deadlineDay: 5 } }).ok).toBe(false);
    expect(validateSpec({ ...s, checklist: [s.checklist[0], { ...s.checklist[1], key: s.checklist[0].key }] }).ok).toBe(false);
    expect(validateSpec({ ...s, checklist: s.checklist.map((c) => ({ ...c, required: false })) }).ok).toBe(false);
  });
});

describe("criação, versionamento e instalação", () => {
  it("AGT-09 só admin de organização criadora cria e publica; compradora pura não cria", async () => {
    const { actor: ana } = await loginAs(db, U.ana.id); // Horizonte: só compradora
    await expectAppError(createDefinition(db, ana, defaultSpec()), "forbidden");
    const { actor: diego } = await loginAs(db, U.diego.id);
    const id = await createDefinition(db, diego, defaultSpec());
    await expectAppError(publishVersion(db, { ...diego, role: "member" }, id), "forbidden");
  });

  it("AGT-10 edição inválida do rascunho é rejeitada e o rascunho permanece intacto", async () => {
    const { actor: diego } = await loginAs(db, U.diego.id);
    const id = await createDefinition(db, diego, defaultSpec());
    await expectAppError(updateDraft(db, diego, id, { ...defaultSpec(), tools: ["documents.list", "shell.exec"] }), "validation");
    const { definition } = await getDefinition(db, diego, id);
    expect(definition.draft_spec.tools).toEqual(defaultSpec().tools);
  });

  it("AGT-11 versão publicada não muda após editar o rascunho; instalação fica presa à versão contratada", async () => {
    const { actor: diego } = await loginAs(db, U.diego.id);
    const { actor: ana } = await loginAs(db, U.ana.id);
    const id = await createDefinition(db, diego, { ...defaultSpec(), name: "Agente Versionado" });
    const v1 = await publishVersion(db, diego, id);
    await expectAppError(publishVersion(db, diego, id), "conflict"); // nada mudou
    const listing = (await listCatalog(db)).find((l) => l.title === "Agente Versionado")!;
    const ins = await contractListing(db, ana, listing.id, "essencial");

    await updateDraft(db, diego, id, { ...defaultSpec(), name: "Agente Versionado", reminders: { ...defaultSpec().reminders, tone: "formal" } });
    const before = await getInstallation(db, ana, ins);
    expect(before.installation.version_id).toBe(v1.id);
    expect(before.installation.spec.reminders.tone).toBe("cordial");

    const v2 = await publishVersion(db, diego, id);
    expect(v2.version).toBe(2);
    expect(v2.spec_hash).not.toBe(v1.spec_hash);
    const after = await getInstallation(db, ana, ins);
    expect(after.installation.version_id).toBe(v1.id); // sem troca silenciosa
    expect(after.installation.latest_version).toBe(2);

    await upgradeToLatest(db, ana, ins); // troca só por ação explícita
    expect((await getInstallation(db, ana, ins)).installation.version_id).toBe(v2.id);
  });

  it("AGT-12 versões publicadas são imutáveis também no banco (gatilho)", async () => {
    const { actor: diego } = await loginAs(db, U.diego.id);
    const [def] = await listDefinitions(db, diego);
    await expect(
      db.asSystem((tx) => tx.query(`update agent_versions set spec = '{}'::jsonb where definition_id = $1`, [def.id])),
    ).rejects.toThrow(/immutable/);
    await expect(db.asSystem((tx) => tx.query(`delete from agent_versions where definition_id = $1`, [def.id]))).rejects.toThrow(/immutable/);
  });

  it("AGT-13 instalações do mesmo agente são independentes (versão, limites, credenciais)", async () => {
    const { actor: ana } = await loginAs(db, U.ana.id);
    const { actor: carla } = await loginAs(db, U.carla.id);
    const listing = (await listCatalog(db))[0];
    const a = await contractListing(db, ana, listing.id, "essencial");
    const b = await contractListing(db, carla, listing.id, "essencial");
    expect(a).not.toBe(b);
    const ia = await getInstallation(db, ana, a);
    const ib = await getInstallation(db, carla, b);
    expect(ia.installation.org_id).not.toBe(ib.installation.org_id);
    expect(ia.connections).toHaveLength(0);
    expect(ib.connections).toHaveLength(0);
  });
});
