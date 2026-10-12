export type ErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "budget_exceeded"
  | "paused"
  | "limit_exceeded"
  | "invalid_signature"
  | "demo_disabled";

const PUBLIC_MESSAGES: Record<ErrorCode, string> = {
  unauthenticated: "Faça login para continuar.",
  forbidden: "Você não tem permissão para esta ação.",
  not_found: "Recurso não encontrado.",
  validation: "Dados inválidos.",
  conflict: "A operação conflita com o estado atual.",
  budget_exceeded: "Orçamento do período esgotado.",
  paused: "O agente está pausado.",
  limit_exceeded: "Limite de execução atingido.",
  invalid_signature: "Assinatura inválida.",
  demo_disabled: "Modo de demonstração desativado.",
};

/** Erro de domínio. `publicMessage` é seguro para exibir; `details` só vai para logs (redigidos). */
export class AppError extends Error {
  readonly publicMessage: string;
  constructor(
    readonly code: ErrorCode,
    message?: string,
    readonly details?: unknown,
  ) {
    super(message ?? PUBLIC_MESSAGES[code]);
    this.publicMessage = message ?? PUBLIC_MESSAGES[code];
  }
}

export const notFound = () => new AppError("not_found");
export const forbidden = () => new AppError("forbidden");
