import { randomBytes } from "node:crypto";

/**
 * Configuração lida do ambiente. Segredos nunca têm valor padrão no código: em modo demo,
 * quando ausentes, são gerados aleatoriamente por processo (e se perdem ao reiniciar).
 */
export interface AppConfig {
  demoMode: boolean;
  aiProvider: "mock" | "anthropic";
  anthropicModel: string;
  credentialsKey: Buffer;
  credentialsKeyId: string;
  credentialsKeyIsEphemeral: boolean;
  webhookSecret: string;
  webhookSecretIsEphemeral: boolean;
}

let cached: AppConfig | undefined;

export function getConfig(): AppConfig {
  if (cached) return cached;
  const demoMode = process.env.DEMO_MODE === "true";

  let credentialsKey: Buffer;
  let credentialsKeyIsEphemeral = false;
  const rawKey = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (rawKey) {
    credentialsKey = Buffer.from(rawKey, "base64");
    if (credentialsKey.length !== 32) throw new Error("CREDENTIALS_ENCRYPTION_KEY deve ter 32 bytes em base64");
  } else if (demoMode) {
    credentialsKey = randomBytes(32);
    credentialsKeyIsEphemeral = true;
  } else {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY é obrigatória fora do modo demo");
  }

  let webhookSecret = process.env.TESTPAY_WEBHOOK_SECRET ?? "";
  let webhookSecretIsEphemeral = false;
  if (!webhookSecret) {
    if (!demoMode) throw new Error("TESTPAY_WEBHOOK_SECRET é obrigatório fora do modo demo");
    webhookSecret = randomBytes(32).toString("base64url");
    webhookSecretIsEphemeral = true;
  }

  const aiProvider = process.env.AI_PROVIDER === "anthropic" ? "anthropic" : "mock";

  cached = {
    demoMode,
    aiProvider,
    anthropicModel: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    credentialsKey,
    credentialsKeyId: process.env.CREDENTIALS_KEY_ID || (credentialsKeyIsEphemeral ? "ephemeral" : "default"),
    credentialsKeyIsEphemeral,
    webhookSecret,
    webhookSecretIsEphemeral,
  };
  return cached;
}

/** Só para testes. */
export function resetConfigForTests(): void {
  cached = undefined;
}
