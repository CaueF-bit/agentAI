import { randomUUID } from "node:crypto";
import { AppError, type ErrorCode } from "./errors";
import { logger } from "./security/redact";

export interface PublicError {
  code: ErrorCode | "internal";
  message: string;
  /** Detalhes seguros para o usuário (ex.: problemas de validação da especificação). */
  issues?: { path: string; message: string }[];
  errorId?: string;
}

const STATUS: Record<PublicError["code"], number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  validation: 400,
  conflict: 409,
  budget_exceeded: 402,
  paused: 409,
  limit_exceeded: 429,
  invalid_signature: 401,
  demo_disabled: 403,
  internal: 500,
};

/**
 * Converte qualquer erro em resposta segura. Erros inesperados viram mensagem genérica
 * com um ID de correlação; o detalhe vai só para o log (redigido).
 */
export function toPublicError(e: unknown): PublicError & { status: number } {
  if (e instanceof AppError) {
    const issues =
      e.code === "validation" && Array.isArray(e.details)
        ? (e.details as { path: string; message: string }[]).map((i) => ({ path: String(i.path), message: String(i.message) }))
        : undefined;
    return { code: e.code, message: e.publicMessage, issues, status: STATUS[e.code] };
  }
  const errorId = randomUUID();
  logger.error(`unexpected error ${errorId}`, e);
  return { code: "internal", message: "Erro inesperado. Informe o código ao suporte.", errorId, status: 500 };
}
