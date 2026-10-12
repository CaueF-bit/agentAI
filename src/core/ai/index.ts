import { getConfig } from "../config";
import { AnthropicProvider } from "./anthropic-provider";
import { MockProvider } from "./mock-provider";
import type { ModelProvider } from "./provider";

let provider: ModelProvider | undefined;

/** Provedor padrão: simulado. O real só com AI_PROVIDER=anthropic (exige credencial e orçamento autorizados). */
export function getModelProvider(): ModelProvider {
  if (provider) return provider;
  const cfg = getConfig();
  provider = cfg.aiProvider === "anthropic" ? new AnthropicProvider(cfg.anthropicModel) : new MockProvider();
  return provider;
}
