import { afterEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { ConfigError, getConfig, resetConfigForTests } from "@/core/config";

// Categoria: dados e proteção de informações — validação de configuração na inicialização.

const KEYS = ["DEMO_MODE", "CREDENTIALS_ENCRYPTION_KEY", "TESTPAY_WEBHOOK_SECRET", "AI_PROVIDER", "ANTHROPIC_API_KEY"] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

function withEnv(vars: Partial<Record<(typeof KEYS)[number], string>>) {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, vars);
  resetConfigForTests();
}

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  resetConfigForTests();
});

describe("configuração", () => {
  it("CFG-01 configuração inválida aponta a variável e o problema sem revelar o valor; espaços e aspas coladas são tolerados", () => {
    const short = randomBytes(16).toString("base64");
    withEnv({ DEMO_MODE: "true", CREDENTIALS_ENCRYPTION_KEY: short });
    let err: unknown;
    try {
      getConfig();
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ConfigError);
    expect((err as ConfigError).issue).toBe("CREDENTIALS_ENCRYPTION_KEY tem 16 bytes; precisa de 32");
    expect(JSON.stringify(err) + String(err)).not.toContain(short);

    const good = randomBytes(32).toString("base64");
    withEnv({ DEMO_MODE: " True\n", CREDENTIALS_ENCRYPTION_KEY: `"${good}"\n`, TESTPAY_WEBHOOK_SECRET: " 'x-segredo-local' " });
    const cfg = getConfig();
    expect(cfg.demoMode).toBe(true);
    expect(cfg.credentialsKey.equals(Buffer.from(good, "base64"))).toBe(true);
    expect(cfg.webhookSecret).toBe("x-segredo-local");

    withEnv({ DEMO_MODE: "sim" });
    expect(() => getConfig()).toThrow(ConfigError);
    withEnv({ DEMO_MODE: "true", AI_PROVIDER: "anthropic" });
    expect(() => getConfig()).toThrow(/ANTHROPIC_API_KEY ausente/);
    withEnv({ DEMO_MODE: "false" });
    expect(() => getConfig()).toThrow(/CREDENTIALS_ENCRYPTION_KEY ausente/);
  });
});
