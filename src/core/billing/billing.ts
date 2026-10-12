import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Db } from "@/db/client";
import { assertBuyerOrg, assertRole, tenantScope, type Actor } from "../auth/actor";
import { audit } from "../audit";
import { getConfig } from "../config";
import { AppError } from "../errors";
import { newId } from "../ids";

// Provedor de pagamento SIMULADO ("testpay"), apenas em modo de teste. Nenhum dado de cartão
// é tratado aqui. O formato imita provedores reais: corpo JSON + cabeçalho
// `t=<unix>,v1=<hmac_sha256(secret, "<t>.<corpo>")>`.

const TOLERANCE_SECONDS = 300;

const EventSchema = z.object({
  id: z.string().min(5).max(100),
  type: z.enum(["subscription.activated", "invoice.payment_failed", "subscription.canceled"]),
  created: z.string().datetime(),
  data: z.object({ subscription_ref: z.string().min(5).max(100) }).strict(),
});

export type BillingEvent = z.infer<typeof EventSchema>;
export type WebhookResult = "applied" | "duplicate" | "stale_ignored" | "unknown_subscription";

export function signPayload(body: string, timestamp: number, secret = getConfig().webhookSecret): string {
  const sig = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

export function verifySignature(body: string, header: string | null, nowSeconds: number, secret = getConfig().webhookSecret): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2) as [string, string]));
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!Number.isFinite(t) || !v1 || !/^[0-9a-f]{64}$/.test(v1)) return false;
  if (Math.abs(nowSeconds - t) > TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
}

const NEXT_STATUS: Record<BillingEvent["type"], "active" | "past_due" | "canceled"> = {
  "subscription.activated": "active",
  "invoice.payment_failed": "past_due",
  "subscription.canceled": "canceled",
};

/**
 * Processa webhook: valida assinatura, rejeita formato inválido, ignora repetidos
 * (ID do evento) e fora de ordem (evento mais antigo que o último aplicado).
 */
export async function processBillingWebhook(
  db: Db,
  rawBody: string,
  signatureHeader: string | null,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<WebhookResult> {
  if (!verifySignature(rawBody, signatureHeader, nowSeconds)) throw new AppError("invalid_signature");
  let parsed: BillingEvent;
  try {
    parsed = EventSchema.parse(JSON.parse(rawBody));
  } catch {
    throw new AppError("validation", "Evento inválido.");
  }
  return db.asSystem(async (tx) => {
    const ins = await tx.query(
      `insert into billing_events (provider_event_id, type, subscription_ref, occurred_at, payload, result)
       values ($1, $2, $3, $4, $5, 'pending') on conflict (provider_event_id) do nothing returning 1`,
      [parsed.id, parsed.type, parsed.data.subscription_ref, parsed.created, rawBody],
    );
    if (!ins.rows.length) return "duplicate";

    const s = await tx.query<{ id: string; org_id: string; last_event_at: string | null; status: string }>(
      `select id, org_id, last_event_at, status from subscriptions where provider_ref = $1 for update`,
      [parsed.data.subscription_ref],
    );
    const sub = s.rows[0];
    let result: WebhookResult;
    if (!sub) {
      result = "unknown_subscription";
    } else if (sub.last_event_at && new Date(parsed.created).getTime() <= new Date(sub.last_event_at).getTime()) {
      result = "stale_ignored";
    } else {
      await tx.query(`update subscriptions set status = $1, last_event_at = $2 where id = $3`, [NEXT_STATUS[parsed.type], parsed.created, sub.id]);
      await audit(tx, { orgId: sub.org_id, actorUserId: null, action: `billing.${parsed.type}`, target: sub.id, metadata: { eventId: parsed.id } });
      result = "applied";
    }
    await tx.query(`update billing_events set result = $1 where provider_event_id = $2`, [result, parsed.id]);
    return result;
  });
}

/**
 * Demo: simula o provedor confirmando o pagamento. Gera um evento ASSINADO e passa pelo
 * mesmo caminho do webhook (sem atalho que pule a verificação).
 */
export async function simulateTestPayment(db: Db, actor: Actor, installationId: string, type: BillingEvent["type"] = "subscription.activated") {
  if (!getConfig().demoMode) throw new AppError("demo_disabled");
  assertBuyerOrg(actor);
  assertRole(actor, "admin");
  const ref = await db.asTenant(tenantScope(actor), async (tx) => {
    const r = await tx.query<{ provider_ref: string }>(
      `select provider_ref from subscriptions where installation_id = $1 and org_id = $2`,
      [installationId, actor.orgId],
    );
    return r.rows[0]?.provider_ref;
  });
  if (!ref) throw new AppError("not_found");
  const event: BillingEvent = { id: newId("evt"), type, created: new Date().toISOString(), data: { subscription_ref: ref } };
  const body = JSON.stringify(event);
  const now = Math.floor(Date.now() / 1000);
  return processBillingWebhook(db, body, signPayload(body, now), now);
}
