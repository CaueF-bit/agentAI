import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import type { Actor } from "@/core/auth/actor";
import { defaultSpec, type AgentSpec } from "@/core/agents/spec";
import type { ModelProvider } from "@/core/ai/provider";
import { MockProvider } from "@/core/ai/mock-provider";
import { decideApproval, listPendingApprovals } from "@/core/approvals/approvals";
import { processBillingWebhook, signPayload } from "@/core/billing/billing";
import { setPaused, updateLimits } from "@/core/installations/installations";
import { SimulatedChannel } from "@/core/runtime/channels";
import { dispatchMessage } from "@/core/runtime/dispatch";
import { runMonthlyCollection } from "@/core/runtime/engine";
import { createRun, executeRun, getRunDetail, listMessages } from "@/core/runtime/runs";
import { memoryEnvironment } from "@/core/runtime/sandbox";
import { setKillSwitch } from "@/core/system/platform";
import { currentCompetence } from "@/core/ids";
import { deps, expectAppError, freshDb, installationOf, key, loginAs, O, U } from "./helpers";

// Categoria: execução, permissões, falhas, limites e repetição de tarefas.

let db: Db;
let ana: Actor;
let ins: string;

const CONTACTS = ["financeiro@paodourado.example", "contato@studioforma.example", "adm@bompreco.example", "joao@reparos.example"];

async function setPolicy(policy: "always" | "first_contact" | "never") {
  await updateLimits(db, ana, ins, { monthlyBudgetCents: 7500, maxConcurrentRuns: 1, approvalPolicy: policy });
}

async function run(d = deps()) {
  const id = await createRun(db, ana, ins, { idempotencyKey: key("run") });
  return { run: await executeRun(db, ana, id, d), d, id };
}

beforeEach(async () => {
  db = await freshDb();
  ({ actor: ana } = await loginAs(db, U.ana.id));
  ins = await installationOf(db, O.horizonte.id);
});

describe("execução do fluxo", () => {
  it("RUN-01 execução completa: classifica, confere lista de documentos e envia lembretes só às pendências", async () => {
    await setPolicy("never");
    const { run: r, d } = await run();
    expect(r.status).toBe("succeeded");
    expect(r.summary?.totals).toMatchObject({ clients: 4, complete: 2, withPending: 2, messagesSent: 2 });
    expect(d.channel.deliveries.map((m) => m.to).sort()).toEqual(["adm@bompreco.example", "contato@studioforma.example"]);
    const detail = await getRunDetail(db, ana, r.id);
    expect(detail.steps.filter((s) => s.tool === "documents.classify" && s.status === "ok")).toHaveLength(6);
    expect(detail.steps.at(-1)?.tool).toBe("report.publish");
  });

  it("RUN-02 conteúdo malicioso em documento não autoriza novas ações nem muda destinatários", async () => {
    await setPolicy("never");
    const { run: r, d } = await run();
    const studio = r.summary!.clients.find((c) => c.clientName.startsWith("Studio"))!;
    // O documento com instruções foi tratado só como documento ("outro"), não como comando.
    expect(studio.missing).toContain("Notas fiscais de saída");
    expect(d.channel.deliveries.every((m) => CONTACTS.includes(m.to))).toBe(true);
    expect(d.channel.deliveries.some((m) => m.to.includes("outro@endereco"))).toBe(false);
    expect(d.channel.deliveries).toHaveLength(2);
    const types = await db.asSystem(async (tx) => (await tx.query<{ classified_type: string }>(`select classified_type from documents where filename = 'anexo_cliente.txt'`)).rows);
    expect(types[0].classified_type).toBe("outro");
  });

  it("RUN-03 com aprovação: nada é enviado antes; aprovar envia exatamente uma vez; reaprovar é recusado", async () => {
    await setPolicy("always");
    const { d } = await run();
    expect(d.channel.deliveries).toHaveLength(0);
    const pending = await listPendingApprovals(db, ana, ins);
    expect(pending).toHaveLength(2);
    const ch = new SimulatedChannel();
    expect(await decideApproval(db, ana, pending[0].id, "approve", pending[0].params_hash, { channel: ch })).toBe("executed");
    expect(ch.deliveries).toHaveLength(1);
    expect(ch.deliveries[0].body).toBe(pending[0].params.body);
    await expectAppError(decideApproval(db, ana, pending[0].id, "approve", pending[0].params_hash, { channel: ch }), "conflict");
    expect(ch.deliveries).toHaveLength(1);
    // Nova execução não duplica: um cliente está no intervalo, o outro aguardando aprovação.
    const { run: r2 } = await run();
    const actions = r2.summary!.clients.filter((c) => c.missing.length).map((c) => c.action).sort();
    expect(actions).toEqual(["awaiting_approval", "interval"]);
  });

  it("RUN-04 aprovação vinculada aos parâmetros: parâmetros alterados ou hash diferente não executam", async () => {
    await setPolicy("always");
    await run();
    const [p] = await listPendingApprovals(db, ana, ins);
    const ch = new SimulatedChannel();
    await expectAppError(decideApproval(db, ana, p.id, "approve", "0".repeat(64), { channel: ch }), "conflict");
    await db.asSystem((tx) => tx.query(`update approvals set params = jsonb_set(params, '{to}', '"atacante@mal.example"') where id = $1`, [p.id]));
    await expectAppError(decideApproval(db, ana, p.id, "approve", p.params_hash, { channel: ch }), "conflict");
    expect(ch.deliveries).toHaveLength(0);
  });

  it("RUN-05 repetir a mesma execução (mesma chave) não executa de novo", async () => {
    await setPolicy("never");
    const k = key("same");
    const id1 = await createRun(db, ana, ins, { idempotencyKey: k });
    const id2 = await createRun(db, ana, ins, { idempotencyKey: k });
    expect(id2).toBe(id1);
    const d = deps();
    const first = await executeRun(db, ana, id1, d);
    const second = await executeRun(db, ana, id1, d);
    expect(second.steps_used).toBe(first.steps_used);
    expect(d.channel.deliveries).toHaveLength(2);
  });
});

describe("permissões de ferramentas e limites", () => {
  const base = (): AgentSpec => ({ ...defaultSpec(), approvals: { sendMessages: "never" } });

  it("RUN-06 o agente não chama ferramenta fora da especificação (mesmo que a especificação escape da validação)", async () => {
    const spec = { ...base(), tools: base().tools.filter((t) => t !== "documents.classify") };
    const mem = memoryEnvironment(spec);
    const out = await runMonthlyCollection({ spec, competence: "2026-10", firmName: "X", approvalPolicy: "never", provider: new MockProvider(), env: mem.env, pricingModel: "claude-opus-5-5" });
    expect(out.status).toBe("failed");
    expect(out.errorCode).toBe("tool_not_allowed");
    expect(mem.steps.find((s) => s.status === "denied")?.tool).toBe("documents.classify");
    expect(mem.sent).toHaveLength(0);
  });

  it("RUN-07 limite de passos e tempo máximo encerram a execução", async () => {
    const stepsSpec = { ...base(), limits: { ...base().limits, maxStepsPerRun: 3 } };
    const m1 = memoryEnvironment(stepsSpec);
    const o1 = await runMonthlyCollection({ spec: stepsSpec, competence: "2026-10", firmName: "X", approvalPolicy: "never", provider: new MockProvider(), env: m1.env, pricingModel: "claude-opus-5-5" });
    expect(o1).toMatchObject({ status: "failed", errorCode: "limit_steps", steps: 3 });

    let t = 0;
    const timeSpec = { ...base(), limits: { ...base().limits, runTimeoutSeconds: 10 } };
    const m2 = memoryEnvironment(timeSpec);
    const o2 = await runMonthlyCollection({
      spec: timeSpec, competence: "2026-10", firmName: "X", approvalPolicy: "never", provider: new MockProvider(), env: m2.env, pricingModel: "claude-opus-5-5",
      now: () => (t += 4_000), // cada leitura do relógio avança 4 s
    });
    expect(o2).toMatchObject({ status: "failed", errorCode: "timeout" });
  });

  it("RUN-08 custo máximo por execução interrompe antes de estourar", async () => {
    const spec = { ...base(), limits: { ...base().limits, maxCostCentsPerRun: 20 } };
    const mem = memoryEnvironment(spec);
    const out = await runMonthlyCollection({ spec, competence: "2026-10", firmName: "X", approvalPolicy: "never", provider: new MockProvider(), env: mem.env, pricingModel: "claude-opus-5-5" });
    expect(out.status).toBe("failed");
    expect(out.errorCode).toBe("limit_run_cost");
    expect(out.costCents).toBeLessThanOrEqual(20);
  });

  it("RUN-09 saída inválida do modelo é rejeitada sem derrubar a execução; lembrete com link não é enviado", async () => {
    const bad: ModelProvider = {
      id: "mock",
      simulated: true,
      generateSpec: async () => ({ output: null, usage: { model: "x", inputTokens: 1, outputTokens: 1 } }),
      classifyDocument: async () => ({ output: { docType: "senha_do_banco", confidence: 2 }, usage: { model: "x", inputTokens: 100, outputTokens: 5 } }),
      draftReminder: async () => ({ output: { body: "Envie seus documentos em http://site-falso.example/login urgente!!" }, usage: { model: "x", inputTokens: 100, outputTokens: 30 } }),
    };
    await setPolicy("never");
    const { run: r, d } = await run(deps([], { provider: bad }));
    expect(r.status).toBe("succeeded");
    // 6 documentos fictícios na competência (3 + 2 + 0 + 1): todos rejeitados.
    expect(r.summary!.clients.reduce((n, c) => n + c.classificationErrors, 0)).toBe(6);
    expect(r.summary!.clients.every((c) => c.action === "draft_failed")).toBe(true);
    expect(d.channel.deliveries).toHaveLength(0);
  });
});

describe("falhas externas e retentativas", () => {
  it("RUN-10 falha temporária é repetida com limite e entrega uma única vez", async () => {
    await setPolicy("never");
    const { d } = await run(deps(["transient", "transient", "ok"]));
    expect(d.channel.deliveries).toHaveLength(2);
    const msgs = await listMessages(db, ana, ins);
    expect(msgs.map((m) => m.attempts).sort()).toEqual([1, 3]);
    expect(msgs.every((m) => m.status === "sent")).toBe(true);
  });

  it("RUN-11 falha persistente para após 3 tentativas, sem repetição ilimitada, e a execução continua", async () => {
    await setPolicy("never");
    const { run: r, d } = await run(deps(["transient", "transient", "transient", "ok"]));
    const msgs = await listMessages(db, ana, ins);
    const failed = msgs.find((m) => m.status === "failed")!;
    expect(failed.attempts).toBe(3);
    expect(d.channel.deliveries).toHaveLength(1);
    expect(r.status).toBe("succeeded");
    expect(r.summary!.clients.map((c) => c.action)).toContain("send_failed");
    // Nova execução logo depois não reenvia a mensagem que falhou (número de lembrete já consumido + intervalo).
    const { d: d2 } = await run();
    expect(d2.channel.deliveries).toHaveLength(0);
  });

  it("RUN-12 tempo esgotado com entrega real: consulta o provedor e não reenvia", async () => {
    await setPolicy("never");
    const { d } = await run(deps(["timeout_delivered", "ok"]));
    expect(d.channel.deliveries).toHaveLength(2); // uma por cliente, nenhuma duplicada
    expect(new Set(d.channel.deliveries.map((m) => m.idempotencyKey)).size).toBe(2);
    const msgs = await listMessages(db, ana, ins);
    expect(msgs.every((m) => m.status === "sent" && m.attempts === 1)).toBe(true);
  });

  it("RUN-13 resultado desconhecido de tentativa anterior: consulta antes de repetir (recuperação após queda)", async () => {
    const ch = new SimulatedChannel();
    const params = { idempotencyKey: `${currentCompetence()}:cli_x:reminder:1`, clientCompanyId: "", clientName: "C", channel: "email" as const, to: "c@c.example", body: "Olá, faltam documentos do mês. Obrigado!", competence: currentCompetence(), reminderNumber: 1 };
    const client = await db.asSystem(async (tx) => (await tx.query<{ id: string }>(`select id from client_companies where org_id = $1 limit 1`, [O.horizonte.id])).rows[0].id);
    params.clientCompanyId = client;
    // Simula: tentativa anterior chegou ao provedor, mas o processo caiu antes de registrar o sucesso.
    await db.asSystem((tx) =>
      tx.query(
        `insert into outbound_messages (id, org_id, installation_id, client_company_id, competence, channel, idempotency_key, body, status, attempts)
         values ('msg_crash', $1, $2, $3, $4, 'email', $5, $6, 'pending', 1)`,
        [O.horizonte.id, ins, client, params.competence, params.idempotencyKey, params.body],
      ),
    );
    await ch.send({ idempotencyKey: params.idempotencyKey, channel: "email", to: params.to, body: params.body });
    const r = await dispatchMessage(db, { orgId: O.horizonte.id }, ins, params, ch, async () => {});
    expect(r).toBe("already_sent");
    expect(ch.deliveries).toHaveLength(1);
  });
});

describe("pausa, interrupção e pré-condições", () => {
  it("RUN-14 pausar impede novas execuções e interrompe a execução em andamento no próximo passo", async () => {
    await setPolicy("never");
    await setPaused(db, ana, ins, true);
    const { run: blocked } = await run();
    expect(blocked).toMatchObject({ status: "cancelled", error_code: "paused" });
    await setPaused(db, ana, ins, false);

    // Pausa no meio: o "modelo" demora e, enquanto isso, a sócia pausa o agente.
    let paused = false;
    const slow = new MockProvider();
    const original = slow.classifyDocument.bind(slow);
    slow.classifyDocument = async (i) => {
      if (!paused) {
        paused = true;
        await setPaused(db, ana, ins, true);
      }
      return original(i);
    };
    const { run: r, d } = await run(deps([], { provider: slow }));
    expect(r).toMatchObject({ status: "cancelled", error_code: "paused" });
    expect(r.steps_used).toBeLessThan(5);
    expect(d.channel.deliveries).toHaveLength(0);
  });

  it("RUN-15 interruptor global do operador cancela execuções e bloqueia aprovações", async () => {
    await setPolicy("always");
    await run();
    const [p] = await listPendingApprovals(db, ana, ins);
    await setKillSwitch(db, U.operadora.id, true, "teste de emergência");
    const { run: r } = await run();
    expect(r).toMatchObject({ status: "cancelled", error_code: "kill_switch" });
    await expectAppError(decideApproval(db, ana, p.id, "approve", p.params_hash, { channel: new SimulatedChannel() }), "paused");
    await setKillSwitch(db, U.operadora.id, false, "fim do teste");
    expect(await decideApproval(db, ana, p.id, "approve", p.params_hash, { channel: new SimulatedChannel() })).toBe("executed");
  });

  it("RUN-16 assinatura inadimplente bloqueia execuções", async () => {
    const ref = await db.asSystem(async (tx) => (await tx.query<{ provider_ref: string }>(`select provider_ref from subscriptions where installation_id = $1`, [ins])).rows[0].provider_ref);
    const now = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ id: "evt_fail_1", type: "invoice.payment_failed", created: new Date(Date.now() + 1000).toISOString(), data: { subscription_ref: ref } });
    expect(await processBillingWebhook(db, body, signPayload(body, now), now)).toBe("applied");
    const { run: r } = await run();
    expect(r).toMatchObject({ status: "failed", error_code: "subscription_inactive" });
  });

  it("RUN-17 limite de execuções simultâneas é respeitado", async () => {
    const other = await createRun(db, ana, ins, { idempotencyKey: key("busy") });
    await db.asSystem((tx) => tx.query(`update runs set status = 'running' where id = $1`, [other]));
    const { run: r } = await run();
    expect(r).toMatchObject({ status: "cancelled", error_code: "concurrency_limit" });
  });
});
