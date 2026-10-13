import { getConfig } from "../config";
import { AnthropicProvider } from "./anthropic-provider";
import { MockProvider } from "./mock-provider";
import type { ModelProvider } from "./provider";

let provider: ModelProvider | undefined;

/** Provedor padrão: simulado. O real só com AI_PROVIDER=anthropic (exige credencial e orçamento autorizados). */
export function getModelProvider(): ModelProvider {
  if (provider) return provider;
  const cfg = getConfig();
  // Chave limpa de espaços e aspas coladas por engano no painel (getConfig já exige que exista).
  const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  provider = cfg.aiProvider === "anthropic" ? new AnthropicProvider(cfg.anthropicModel, apiKey) : new MockProvider();
  return provider;
}
