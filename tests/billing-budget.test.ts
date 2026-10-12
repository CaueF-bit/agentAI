import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import type { Actor } from "@/core/auth/actor";
import { decideApproval, listPendingApprovals } from "@/core/approvals/approvals";
import { processBillingWebhook, signPayload, simulateTestPayment } from "@/core/billing/billing";
import { periodOf, reserve } from "@/core/budget/budget";
import { listCatalog, PLAN_TEMPLATES, setListingStatus } from "@/core/catalog/catalog";
import { contractListing, getInstallation, updateLimits } from "@/core/installations/installations";
import { SimulatedChannel } from "@/core/runtime/channels";
import { createRun, executeRun } from "@/core/runtime/runs";
// @ts-expect-error módulo .mjs sem tipos (calculadora financeira)
import { contribution } from "../finance/model.mjs";
import { readFileSync } from "node:fs";
import { deps, expectAppError, freshDb, installationOf, key, loginAs, O, U } from "./helpers";

// Categoria: planos, consumo, contratação e cobrança em ambiente de teste.

let db: Db;
let ana: Actor;
let ins: string;

const budget = (id: string) =>
  db.asSystem(async (tx) => (await tx.query<{ limit_cents: number; spent_cents: number; reserved_cents: number }>(`select limit_cents, spent_cents, reserved_cents from budget_periods where installation_id = $1 and period = $2`, [id, periodOf()])).rows[0]);

function signed(event: object, now = Math.floor(Date.now() / 1000)) {
  const body = JSON.stringify(event);
  return { body, header: signPayload(body, now), now };
}

beforeEach(async () => {
  db = await freshDb();
  ({ actor: ana } = await loginAs(db, U.ana.id));
  ins = await installationOf(db, O.horizonte.id);
});

describe("orçamento e consumo", () => {
  it("BIL-01 reservas simultâneas nunca ultrapassam o limite do período", async () => {
    await db.asSystem((tx) => tx.query(`update budget_periods set limit_cents = 100, spent_cents = 0, reserved_cents = 0 where installation_id = $1`, [ins]));
    const results = await Promise.all(Array.from({ length: 20 }, () => db.asTenant({ orgId: O.horizonte.id }, (tx) => reserve(tx, ins, periodOf(), 15))));
    expect(results.filter(Boolean)).toHaveLength(6); // 6 × 15 = 90 ≤ 100; a 7ª passaria do limite
    const b = await budget(ins);
    expect(b.spent_cents + b.reserved_cents).toBeLessThanOrEqual(b.limit_cents);
  });

  it("BIL-02 execuções simultâneas com orçamento quase esgotado: gasto total respeita o limite", async () => {
    await updateLimits(db, ana, ins, { monthlyBudgetCents: 15000, maxConcurrentRuns: 1, approvalPolicy: "never" });
    // Instalação com concorrência 3 (plano profissional) para permitir execuções paralelas.
    const listing = (await listCatalog(db))[0];
    const pro = await contractListing(db, ana, listing.id, "profissional");
    await simulateTestPayment(db, ana, pro);
    await updateLimits(db, ana, pro, { monthlyBudgetCents: 100, maxConcurrentRuns: 3, approvalPolicy: "never" });
    // Orçamento do período quase esgotado: só 40 centavos disponíveis para 3 execuções paralelas.
    await db.asSystem((tx) => tx.query(`update budget_periods set spent_cents = 60 where installation_id = $1`, [pro]));
    const ids = await Promise.all([1, 2, 3].map(() => createRun(db, ana, pro, { idempotencyKey: key("par") })));
    const runs = await Promise.all(ids.map((id) => executeRun(db, ana, id, deps())));
    const b = await budget(pro);
    expect(b.spent_cents).toBeLessThanOrEqual(100);
    expect(b.reserved_cents).toBe(0);
    expect(runs.some((r) => r.status === "budget_blocked")).toBe(true);
    const total = runs.reduce((n, r) => n + r.cost_cents, 0);
    expect(total).toBe(b.spent_cents - 60);
  });

  it("BIL-03 orçamento esgotado bloqueia novas chamadas pagas e marca a execução", async () => {
    await db.asSystem((tx) => tx.query(`update budget_periods set limit_cents = 10 where installation_id = $1`, [ins]));
    const id = await createRun(db, ana, ins, { idempotencyKey: key("empty") });
    const r = await executeRun(db, ana, id, deps());
    expect(r).toMatchObject({ status: "budget_blocked", error_code: "budget_exceeded", cost_cents: 0 });
  });

  it("BIL-04 limites do comprador respeitam o teto do plano e o que já foi consumido", async () => {
    await expectAppError(updateLimits(db, ana, ins, { monthlyBudgetCents: 999_999, maxConcurrentRuns: 1, approvalPolicy: "always" }), "validation");
    await expectAppError(updateLimits(db, ana, ins, { monthlyBudgetCents: 1000, maxConcurrentRuns: 5, approvalPolicy: "always" }), "validation");
    await db.asSystem((tx) => tx.query(`update budget_periods set spent_cents = 900 where installation_id = $1`, [ins]));
    await expectAppError(updateLimits(db, ana, ins, { monthlyBudgetCents: 500, maxConcurrentRuns: 1, approvalPolicy: "always" }), "validation");
  });

  it("BIL-05 retentativas de envio não duplicam a cobrança", async () => {
    await updateLimits(db, ana, ins, { monthlyBudgetCents: 7500, maxConcurrentRuns: 1, approvalPolicy: "always" });
    const id = await createRun(db, ana, ins, { idempotencyKey: key("charge") });
    await executeRun(db, ana, id, deps());
    const before = await budget(ins);
    const [p] = await listPendingApprovals(db, ana, ins);
    const ch = new SimulatedChannel(["transient", "timeout_lost", "ok"]);
    expect(await decideApproval(db, ana, p.id, "approve", p.params_hash, { channel: ch, sleep: async () => {} })).toBe("executed");
    const after = await budget(ins);
    expect(after.spent_cents - before.spent_cents).toBe(1); // um envio cobrado, apesar de 3 tentativas
    expect(after.reserved_cents).toBe(0);
    expect(ch.deliveries).toHaveLength(1);
  });
});

describe("contratação e planos", () => {
  it("BIL-06 preço e plano vêm do servidor; plano inexistente ou anúncio retirado são recusados", async () => {
    const listing = (await listCatalog(db))[0];
    const id = await contractListing(db, ana, listing.id, "essencial");
    const sub = await db.asSystem(async (tx) => (await tx.query<{ price_cents: number; status: string; mode: string }>(`select price_cents, status, mode from subscriptions where installation_id = $1`, [id])).rows[0]);
    expect(sub).toEqual({ price_cents: PLAN_TEMPLATES[0].monthlyPriceCents, status: "pending", mode: "test" });
    await expectAppError(contractListing(db, ana, listing.id, "gratis-para-sempre"), "validation");
    await setListingStatus(db, U.operadora.id, listing.id, "unlisted");
    await expectAppError(contractListing(db, ana, listing.id, "essencial"), "not_found");
    // Quem já contratou continua vendo a própria instalação.
    await expect(getInstallation(db, ana, id)).resolves.toBeTruthy();
  });

  it("BIL-07 cliente não define preço, status de assinatura nem limites acima do plano (barreiras no banco)", async () => {
    const asTenant = (sql: string) => db.asTenant({ orgId: O.horizonte.id }, (tx) => tx.query(sql));
    await expect(asTenant(`update plans set monthly_price_cents = 0`)).rejects.toThrow(/permission denied/);
    await expect(asTenant(`update subscriptions set price_cents = 0, status = 'active'`)).rejects.toThrow(/permission denied/);
    await expect(asTenant(`update installations set monthly_budget_cents = 99999999`)).rejects.toThrow(/exceed plan caps/);
    await expect(asTenant(`update budget_periods set limit_cents = 99999999`)).rejects.toThrow(/exceeds installation budget/);
  });
});

describe("webhooks de pagamento (modo teste)", () => {
  async function ref() {
    return db.asSystem(async (tx) => (await tx.query<{ provider_ref: string }>(`select provider_ref from subscriptions where installation_id = $1`, [ins])).rows[0].provider_ref);
  }

  it("BIL-08 webhook sem assinatura, com assinatura errada, expirada ou corpo adulterado é rejeitado", async () => {
    const e = { id: "evt_sig_1", type: "subscription.canceled", created: new Date().toISOString(), data: { subscription_ref: await ref() } };
    const s = signed(e);
    await expectAppError(processBillingWebhook(db, s.body, null, s.now), "invalid_signature");
    // Troca o primeiro dígito da assinatura por um SEMPRE diferente (antes era fixo "0" e às vezes não mudava nada).
    const tampered = s.header.replace(/v1=(.)/, (_m, c: string) => `v1=${c === "0" ? "1" : "0"}`);
    expect(tampered).not.toBe(s.header);
    await expectAppError(processBillingWebhook(db, s.body, tampered, s.now), "invalid_signature");
    await expectAppError(processBillingWebhook(db, s.body, s.header, s.now + 3600), "invalid_signature");
    await expectAppError(processBillingWebhook(db, s.body.replace("canceled", "activated"), s.header, s.now), "invalid_signature");
    const bad = signed({ foo: "bar" });
    await expectAppError(processBillingWebhook(db, bad.body, bad.header, bad.now), "validation");
    const st = await db.asSystem(async (tx) => (await tx.query<{ status: string }>(`select status from subscriptions where installation_id = $1`, [ins])).rows[0].status);
    expect(st).toBe("active");
  });

  it("BIL-09 evento repetido não duplica operação e evento fora de ordem é ignorado", async () => {
    const r = await ref();
    const t0 = Date.now();
    const cancel = signed({ id: "evt_c", type: "subscription.canceled", created: new Date(t0 + 2000).toISOString(), data: { subscription_ref: r } });
    const olderActivate = signed({ id: "evt_a_old", type: "subscription.activated", created: new Date(t0 + 1000).toISOString(), data: { subscription_ref: r } });
    expect(await processBillingWebhook(db, cancel.body, cancel.header, cancel.now)).toBe("applied");
    expect(await processBillingWebhook(db, cancel.body, cancel.header, cancel.now)).toBe("duplicate");
    expect(await processBillingWebhook(db, olderActivate.body, olderActivate.header, olderActivate.now)).toBe("stale_ignored");
    const st = await db.asSystem(async (tx) => (await tx.query<{ status: string }>(`select status from subscriptions where installation_id = $1`, [ins])).rows[0].status);
    expect(st).toBe("canceled");
    const audits = await db.asSystem(async (tx) => (await tx.query<{ n: number }>(`select count(*)::int as n from audit_log where action = 'billing.subscription.canceled'`)).rows[0].n);
    expect(audits).toBe(1);
  });
});

describe("modelo financeiro", () => {
  it("BIL-10 receita da plataforma considera só a parcela retida, não o volume repassado ao criador", () => {
    const a = JSON.parse(readFileSync("finance/assumptions.json", "utf8"));
    const c = contribution(a, "base");
    expect(c.retained).toBeCloseTo(c.billed - c.creatorPayout, 6);
    expect(c.creatorPayout).toBeCloseTo(c.billed * a.revenueSplit.partnerAgentRevenueShare * a.revenueSplit.creatorPayoutPct, 6);
    const heavy = contribution(a, "base", { usageMultiplier: 4 });
    expect(heavy.margin).toBeLessThan(c.margin);
  });
});
