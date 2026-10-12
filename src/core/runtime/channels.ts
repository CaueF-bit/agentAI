// Canal de mensagens. No MVP só existe o canal SIMULADO: nada sai da plataforma.
// O despacho garante: no máximo uma entrega por chave de idempotência, retentativas
// limitadas e consulta de estado antes de repetir quando o resultado é desconhecido.

export class TransientChannelError extends Error {}
/** Tempo esgotado: não se sabe se a mensagem foi entregue. */
export class UnknownOutcomeError extends Error {}

export interface OutgoingMessage {
  idempotencyKey: string;
  channel: "email" | "whatsapp";
  to: string;
  body: string;
}

export interface ChannelAdapter {
  readonly simulated: boolean;
  send(msg: OutgoingMessage): Promise<{ providerMessageId: string }>;
  /** Consulta no provedor se a chave já foi entregue (usada antes de repetir após timeout). */
  lookup(idempotencyKey: string): Promise<{ providerMessageId: string } | null>;
}

export type FailureMode = "ok" | "transient" | "timeout_delivered" | "timeout_lost";

/**
 * Canal simulado com falhas programáveis (testes e demonstração).
 * `deliveries` registra o que "chegou" ao destinatário — é o que os testes conferem
 * para provar que não houve duplicidade.
 */
export class SimulatedChannel implements ChannelAdapter {
  readonly simulated = true;
  readonly deliveries: OutgoingMessage[] = [];
  private readonly delivered = new Map<string, string>();
  private seq = 0;

  constructor(private readonly plan: FailureMode[] = []) {}

  async send(msg: OutgoingMessage) {
    const mode = this.plan.shift() ?? "ok";
    if (mode === "transient") throw new TransientChannelError("simulated transient failure");
    if (mode === "timeout_lost") throw new UnknownOutcomeError("simulated timeout (not delivered)");
    const id = `sim_${++this.seq}`;
    this.deliveries.push(msg);
    this.delivered.set(msg.idempotencyKey, id);
    if (mode === "timeout_delivered") throw new UnknownOutcomeError("simulated timeout (delivered)");
    return { providerMessageId: id };
  }

  async lookup(idempotencyKey: string) {
    const id = this.delivered.get(idempotencyKey);
    return id ? { providerMessageId: id } : null;
  }
}

export const MAX_SEND_ATTEMPTS = 3;
