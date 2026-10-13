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

/** Problema de configuração. `issue` diz QUAL variável e o tipo de problema, nunca o valor. */
export class ConfigError extends Error {
  constructor(readonly issue: string) {
    super(`configuração inválida: ${issue}`);
  }
}

/** Lê variável ignorando espaços, quebras de linha e aspas coladas por engano no painel. */
function env(name: string): string {
  return (process.env[name] ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
}

let cached: AppConfig | undefined;

export function getConfig(): AppConfig {
  if (cached) return cached;
  const demoRaw = env("DEMO_MODE").toLowerCase();
  if (demoRaw && demoRaw !== "true" && demoRaw !== "false") throw new ConfigError("DEMO_MODE deve ser true ou false");
  const demoMode = demoRaw === "true";

  let credentialsKey: Buffer;
  let credentialsKeyIsEphemeral = false;
  const rawKey = env("CREDENTIALS_ENCRYPTION_KEY");
  if (rawKey) {
    if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(rawKey)) throw new ConfigError("CREDENTIALS_ENCRYPTION_KEY não está em base64");
    credentialsKey = Buffer.from(rawKey, "base64");
    if (credentialsKey.length !== 32) throw new ConfigError(`CREDENTIALS_ENCRYPTION_KEY tem ${credentialsKey.length} bytes; precisa de 32`);
  } else if (demoMode) {
    credentialsKey = randomBytes(32);
    credentialsKeyIsEphemeral = true;
  } else {
    throw new ConfigError("CREDENTIALS_ENCRYPTION_KEY ausente (obrigatória fora do modo demo)");
  }

  let webhookSecret = env("TESTPAY_WEBHOOK_SECRET");
  let webhookSecretIsEphemeral = false;
  if (!webhookSecret) {
    if (!demoMode) throw new ConfigError("TESTPAY_WEBHOOK_SECRET ausente (obrigatório fora do modo demo)");
    webhookSecret = randomBytes(32).toString("base64url");
    webhookSecretIsEphemeral = true;
  }

  const providerRaw = env("AI_PROVIDER").toLowerCase() || "mock";
  if (providerRaw !== "mock" && providerRaw !== "anthropic") throw new ConfigError("AI_PROVIDER deve ser mock ou anthropic");
  const aiProvider = providerRaw;
  if (aiProvider === "anthropic" && !env("ANTHROPIC_API_KEY")) throw new ConfigError("ANTHROPIC_API_KEY ausente com AI_PROVIDER=anthropic");

  cached = {
    demoMode,
    aiProvider,
    anthropicModel: env("ANTHROPIC_MODEL") || "claude-opus-5-5",
    credentialsKey,
    credentialsKeyId: env("CREDENTIALS_KEY_ID") || (credentialsKeyIsEphemeral ? "ephemeral" : "default"),
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
