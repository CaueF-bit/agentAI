import { processBillingWebhook } from "@/core/billing/billing";
import { toPublicError } from "@/core/http";
import { getDb } from "@/lib/server/context";

// Webhook do provedor de pagamento SIMULADO (modo teste). Lê o corpo cru para verificar a
// assinatura HMAC antes de qualquer interpretação.
export async function POST(req: Request) {
  const body = await req.text();
  try {
    const result = await processBillingWebhook(await getDb(), body, req.headers.get("x-testpay-signature"));
    return Response.json({ received: true, result });
  } catch (e) {
    const p = toPublicError(e);
    return Response.json({ error: p.code, message: p.message }, { status: p.status });
  }
}
