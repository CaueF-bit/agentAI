import type { Db, TenantScope } from "@/db/client";
import { newId } from "../ids";
import { logger } from "../security/redact";
import { MAX_SEND_ATTEMPTS, TransientChannelError, UnknownOutcomeError, type ChannelAdapter } from "./channels";
import type { SendParams, SendResult } from "./engine";

export type Sleep = (ms: number) => Promise<void>;
export const realSleep: Sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Envio com saída persistida (outbox):
 * 1. Registra a mensagem com chave de idempotência única por instalação (sem duplicar).
 * 2. Se já foi enviada, não envia de novo.
 * 3. Se uma tentativa anterior terminou sem resposta, CONSULTA o provedor antes de repetir.
 * 4. Repete no máximo MAX_SEND_ATTEMPTS vezes, com espera crescente; depois marca falha.
 * Nenhuma transação fica aberta durante a chamada ao canal.
 */
export async function dispatchMessage(
  db: Db,
  scope: TenantScope,
  installationId: string,
  p: SendParams,
  channel: ChannelAdapter,
  sleep: Sleep = realSleep,
): Promise<SendResult> {
  const row = await db.asTenant(scope, async (tx) => {
    await tx.query(
      `insert into outbound_messages (id, org_id, installation_id, client_company_id, competence, channel, idempotency_key, body, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') on conflict (installation_id, idempotency_key) do nothing`,
      [newId("msg"), scope.orgId, installationId, p.clientCompanyId, p.competence, p.channel, p.idempotencyKey, p.body],
    );
    const r = await tx.query<{ id: string; status: string; attempts: number; body: string }>(
      `select id, status, attempts, body from outbound_messages where installation_id = $1 and idempotency_key = $2`,
      [installationId, p.idempotencyKey],
    );
    return r.rows[0];
  });
  if (row.status === "sent") return "already_sent";
  if (row.status === "failed") return "failed";

  const markSent = (providerMessageId: string) =>
    db.asTenant(scope, (tx) =>
      tx.query(`update outbound_messages set status = 'sent', provider_message_id = $1, sent_at = now() where id = $2`, [providerMessageId, row.id]),
    );

  // Tentativa anterior com resultado desconhecido (ex.: processo caiu): consulta antes de repetir.
  if (row.attempts > 0) {
    const found = await channel.lookup(p.idempotencyKey);
    if (found) {
      await markSent(found.providerMessageId);
      return "already_sent";
    }
  }

  for (let attempt = row.attempts + 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
    await db.asTenant(scope, (tx) => tx.query(`update outbound_messages set attempts = $1 where id = $2`, [attempt, row.id]));
    try {
      // O corpo enviado é o registrado na saída (o aprovado), não um novo texto.
      const r = await channel.send({ idempotencyKey: p.idempotencyKey, channel: p.channel, to: p.to, body: row.body });
      await markSent(r.providerMessageId);
      return "sent";
    } catch (e) {
      let lastError = "erro desconhecido";
      if (e instanceof UnknownOutcomeError) {
        const found = await channel.lookup(p.idempotencyKey);
        if (found) {
          await markSent(found.providerMessageId);
          return "sent";
        }
        lastError = "tempo esgotado sem entrega confirmada";
      } else if (e instanceof TransientChannelError) {
        lastError = "falha temporária do canal";
      } else {
        logger.warn("channel send failed", e);
      }
      await db.asTenant(scope, (tx) => tx.query(`update outbound_messages set last_error = $1 where id = $2`, [lastError, row.id]));
      if (attempt < MAX_SEND_ATTEMPTS) await sleep(200 * 2 ** (attempt - 1));
    }
  }
  await db.asTenant(scope, (tx) => tx.query(`update outbound_messages set status = 'failed' where id = $1`, [row.id]));
  return "failed";
}
