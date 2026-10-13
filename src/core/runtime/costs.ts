import type { ModelUsage } from "../ai/provider";

// Preços oficiais por milhão de tokens (US$), Anthropic, consultados em 2026-10-11 [S22].
export const PRICES_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

// Câmbio de referência PTAX 09/10/2026 [S01]. Só para estimar consumo em BRL.
export const BRL_PER_USD = 4.9892;

/**
 * Custo em centavos de BRL, arredondado para cima (mínimo 1 centavo por chamada).
 * O provedor simulado é precificado como o modelo configurado, para exercitar orçamento
 * com valores realistas — o painel indica que o custo é SIMULADO nesse caso.
 */
export function costCentsFromUsage(usage: ModelUsage, pricingModel: string): number {
  const p = PRICES_USD_PER_MTOK[usage.model] ?? PRICES_USD_PER_MTOK[pricingModel] ?? PRICES_USD_PER_MTOK["claude-opus-5-5"];
  const usd = (usage.inputTokens * p.input + usage.outputTokens * p.output) / 1e6;
  return Math.max(1, Math.ceil(usd * BRL_PER_USD * 100));
}
