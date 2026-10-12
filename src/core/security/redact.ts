// Redação de segredos para logs, auditoria e respostas de erro.
// Mascara padrões comuns de credenciais e campos com nomes sensíveis.

const SECRET_PATTERNS: RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]{8,}/g, // chaves Anthropic
  /sk-[A-Za-z0-9]{16,}/g, // chaves estilo OpenAI/Stripe
  /(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{8,}/g, // Stripe
  /whsec_[A-Za-z0-9_]{8,}/g, // segredos de webhook
  /gh[pousr]_[A-Za-z0-9]{20,}/g, // GitHub
  /AKIA[0-9A-Z]{16}/g, // AWS
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWT
  /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s"']+/g, // URLs de conexão com credencial
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

const SENSITIVE_KEYS = /(secret|token|password|senha|api[_-]?key|authorization|cookie|credential|ciphertext|private)/i;

export function redactString(input: string): string {
  let out = input;
  for (const p of SECRET_PATTERNS) out = out.replace(p, "[REDACTED]");
  // "Bearer xyz", "token=xyz", "password: xyz"
  out = out.replace(/\b(bearer)\s+[A-Za-z0-9._~+/-]{8,}=*/gi, "$1 [REDACTED]");
  out = out.replace(/\b(token|password|senha|secret|api[_-]?key)(\s*[=:]\s*)([^\s,;"']{4,})/gi, "$1$2[REDACTED]");
  return out;
}

export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[TRUNCATED]";
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((v) => redactValue(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.test(k) ? "[REDACTED]" : redactValue(v, depth + 1);
    }
    return out;
  }
  return value;
}

/** Logger mínimo que sempre redige. Use em vez de console.* no código do servidor. */
export const logger = {
  info: (msg: string, meta?: unknown) => console.info(redactString(msg), meta === undefined ? "" : JSON.stringify(redactValue(meta))),
  warn: (msg: string, meta?: unknown) => console.warn(redactString(msg), meta === undefined ? "" : JSON.stringify(redactValue(meta))),
  error: (msg: string, meta?: unknown) => {
    const m =
      meta instanceof Error ? { name: meta.name, message: meta.message, stack: meta.stack } : meta;
    console.error(redactString(msg), m === undefined ? "" : JSON.stringify(redactValue(m)));
  },
};
