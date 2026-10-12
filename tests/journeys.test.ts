import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { requireActor } from "@/core/auth/session";
import { buildFromDescription } from "@/core/agents/builder";
import { createDefinition, publishVersion } from "@/core/agents/definitions";
import { MockProvider } from "@/core/ai/mock-provider";
import { decideApproval, listPendingApprovals } from "@/core/approvals/approvals";
import { simulateTestPayment } from "@/core/billing/billing";
import { getListingBySlug, listCatalog } from "@/core/catalog/catalog";
import { addClient, addDocument } from "@/core/clients/clients";
import { contractListing, getInstallation, setConnection, setPaused, updateLimits } from "@/core/installations/installations";
import { revokeMember } from "@/core/orgs/members";
import { SimulatedChannel } from "@/core/runtime/channels";
import { createRun, executeRun, getRunDetail, listMessages, usageForInstallation } from "@/core/runtime/runs";
import { runSandbox } from "@/core/runtime/sandbox";
import { currentCompetence } from "@/core/ids";
import { deps, expectAppError, freshDb, installationOf, key, loginAs, O, U } from "./helpers";

// Categoria: jornadas completas (J1–J5 de docs/product/user-journeys.md), do login ao resultado.

let db: Db;
beforeEach(async () => {
  db = await freshDb();
});

describe("jornadas completas", () => {
  it("JOR-01 criador descreve, ajusta, testa em sandbox e publica; agente aparece no catálogo", async () => {
    const { actor: diego } = await loginAs(db, U.diego.id);
    const built = await buildFromDescription(
      new MockProvider(),
      "Agente para cobrar extrato, notas de entrada e notas de saída até o dia 8 por e-mail, a cada 3 dias, no máximo 3 lembretes, com aprovação.",
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const spec = { ...built.spec, name: "Fechamento Express" };
    const sandbox = await runSandbox(spec, new MockProvider(), diego.orgName, currentCompetence());
    expect(sandbox.outcome.status).toBe("succeeded");
    expect(sandbox.messagesThatWouldBeSent).toHaveLength(0); // com aprovação, nada sairia sem decisão humana
    expect(sandbox.approvalsThatWouldBeRequested.every((p) => !p.to.includes("outro@endereco"))).toBe(true);
    const id = await createDefinition(db, diego, spec);
    const v = await publishVersion(db, diego, id);
    expect(v.version).toBe(1);
    const listing = (await listCatalog(db)).find((l) => l.title === "Fechamento Express")!;
    const detail = await getListingBySlug(db, listing.slug);
    expect(detail.plans.map((p) => p.code)).toEqual(["essencial", "profissional"]);
    expect(detail.listing.is_fictitious).toBe(true);
  });

  it("JOR-02 escritório contrata em modo teste, paga (simulado), conecta canal e define limites", async () => {
    const { actor: carla } = await loginAs(db, U.carla.id);
    const listing = (await listCatalog(db))[0];
    const ins = await contractListing(db, carla, listing.id, "profissional");
    expect((await getInstallation(db, carla, ins)).subscription?.status).toBe("pending");
    const runBefore = await createRun(db, carla, ins, { idempotencyKey: key("j2") });
    expect((await executeRun(db, carla, runBefore, deps())).error_code).toBe("subscription_inactive");
    expect(await simulateTestPayment(db, carla, ins)).toBe("applied");
    await setConnection(db, carla, ins, { kind: "email", label: "SMTP simulado", secret: "token-sintetico-123456" });
    await updateLimits(db, carla, ins, { monthlyBudgetCents: 20000, maxConcurrentRuns: 2, approvalPolicy: "first_contact" });
    const view = await getInstallation(db, carla, ins);
    expect(view.subscription).toMatchObject({ status: "active", price_cents: 149000, mode: "test" });
    expect(view.installation).toMatchObject({ monthly_budget_cents: 20000, max_concurrent_runs: 2, approval_policy: "first_contact" });
    expect(view.connections).toHaveLength(1);
  });

  it("JOR-03 assistente executa, sócia aprova, mensagem sai uma vez e o painel mostra resultado e consumo", async () => {
    const { actor: ana } = await loginAs(db, U.ana.id);
    const { actor: bruno } = await loginAs(db, U.bruno.id);
    const ins = await installationOf(db, O.horizonte.id);
    const runId = await createRun(db, bruno, ins, { idempotencyKey: key("j3") });
    const run = await executeRun(db, bruno, runId, deps());
    expect(run.status).toBe("succeeded");
    expect(run.summary?.totals.approvalsRequested).toBe(2);
    const pending = await listPendingApprovals(db, ana, ins);
    const ch = new SimulatedChannel();
    for (const p of pending) expect(await decideApproval(db, ana, p.id, "approve", p.params_hash, { channel: ch })).toBe("executed");
    expect(ch.deliveries).toHaveLength(2);
    const msgs = await listMessages(db, ana, ins);
    expect(msgs.filter((m) => m.status === "sent")).toHaveLength(2);
    const usage = await usageForInstallation(db, ana, ins);
    expect(usage.find((u) => u.kind === "model")!.cost_cents).toBeGreaterThan(0);
    expect(usage.find((u) => u.kind === "channel")!.cost_cents).toBe(2);
    const detail = await getRunDetail(db, ana, runId);
    expect(detail.steps.length).toBe(run.steps_used + 0);
  });

  it("JOR-04 controle de gasto e pausa: orçamento baixo bloqueia, pausa impede, retomar volta a funcionar", async () => {
    const { actor: ana } = await loginAs(db, U.ana.id);
    const ins = await installationOf(db, O.horizonte.id);
    const cli = await addClient(db, ana, { name: "Cliente Novo (fictício)", taxRegime: "simples", contactEmail: "novo@cliente.example" });
    await addDocument(db, ana, { clientCompanyId: cli, competence: currentCompetence(), filename: "extrato_novo.txt", content: "extrato" });
    await updateLimits(db, ana, ins, { monthlyBudgetCents: 100, maxConcurrentRuns: 1, approvalPolicy: "never" });
    await db.asSystem((tx) => tx.query(`update budget_periods set spent_cents = 95 where installation_id = $1`, [ins]));
    const r1 = await executeRun(db, ana, await createRun(db, ana, ins, { idempotencyKey: key("j4a") }), deps());
    expect(r1.status).toBe("budget_blocked");
    await updateLimits(db, ana, ins, { monthlyBudgetCents: 7500, maxConcurrentRuns: 1, approvalPolicy: "never" });
    await setPaused(db, ana, ins, true);
    const r2 = await executeRun(db, ana, await createRun(db, ana, ins, { idempotencyKey: key("j4b") }), deps());
    expect(r2.error_code).toBe("paused");
    await setPaused(db, ana, ins, false);
    const r3 = await executeRun(db, ana, await createRun(db, ana, ins, { idempotencyKey: key("j4c") }), deps());
    expect(r3.status).toBe("succeeded");
  });

  it("JOR-05 isolamento e revogação: outra organização não enxerga nada e acesso revogado para na hora", async () => {
    const { actor: ana } = await loginAs(db, U.ana.id);
    const { token: brunoToken, actor: bruno } = await loginAs(db, U.bruno.id);
    const { actor: carla } = await loginAs(db, U.carla.id);
    const ins = await installationOf(db, O.horizonte.id);
    const runId = await createRun(db, bruno, ins, { idempotencyKey: key("j5") });
    await executeRun(db, bruno, runId, deps());
    await expectAppError(getRunDetail(db, carla, runId), "not_found");
    await expectAppError(getInstallation(db, carla, ins), "not_found");
    expect(await listPendingApprovals(db, carla)).toHaveLength(0);
    await revokeMember(db, ana, U.bruno.id);
    await expectAppError(requireActor(db, brunoToken), "forbidden");
  });
});
