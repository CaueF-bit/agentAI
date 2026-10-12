// Registro fechado de ferramentas. A IA construtora só pode escolher IDs desta lista,
// e o runtime só executa ferramentas que estão na especificação publicada E aqui.

export const TOOL_IDS = [
  "documents.list",
  "documents.classify",
  "checklist.evaluate",
  "messages.draft",
  "messages.send",
  "report.publish",
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export interface ToolMeta {
  id: ToolId;
  label: string;
  description: string;
  /** Usa modelo de IA (custo variável, reserva de orçamento). */
  usesModel: boolean;
  /** Produz efeito fora da plataforma (exige idempotência e pode exigir aprovação). */
  externalSideEffect: boolean;
  /** Custo estimado reservado antes de cada chamada, em centavos de BRL. */
  estimatedCostCents: number;
}

export const TOOLS: Record<ToolId, ToolMeta> = {
  "documents.list": {
    id: "documents.list",
    label: "Listar documentos recebidos",
    description: "Lê os documentos recebidos de cada empresa-cliente na competência.",
    usesModel: false,
    externalSideEffect: false,
    estimatedCostCents: 0,
  },
  "documents.classify": {
    id: "documents.classify",
    label: "Classificar documento",
    description: "Identifica o tipo do documento (extrato, nota fiscal, folha…). O conteúdo é tratado como não confiável.",
    usesModel: true,
    externalSideEffect: false,
    // Teto por chamada (até ~2,2 mil tokens de entrada + 1 mil de saída no Opus 5.5), não a média.
    estimatedCostCents: 15,
  },
  "checklist.evaluate": {
    id: "checklist.evaluate",
    label: "Conferir lista de documentos",
    description: "Compara documentos recebidos com a lista exigida para o regime da empresa-cliente.",
    usesModel: false,
    externalSideEffect: false,
    estimatedCostCents: 0,
  },
  "messages.draft": {
    id: "messages.draft",
    label: "Redigir lembrete",
    description: "Redige lembrete das pendências no tom configurado. Não lê o conteúdo dos documentos.",
    usesModel: true,
    externalSideEffect: false,
    // Teto por chamada (saída de até 2 mil tokens no Opus 5.5).
    estimatedCostCents: 25,
  },
  "messages.send": {
    id: "messages.send",
    label: "Enviar lembrete",
    description: "Envia lembrete pelo canal conectado (simulado no MVP), com idempotência e aprovação conforme política.",
    usesModel: false,
    externalSideEffect: true,
    estimatedCostCents: 1,
  },
  "report.publish": {
    id: "report.publish",
    label: "Publicar relatório da execução",
    description: "Grava o resumo de pendências por empresa-cliente no painel do escritório.",
    usesModel: false,
    externalSideEffect: false,
    estimatedCostCents: 0,
  },
};

/** Ferramentas que o fluxo de fechamento mensal exige para funcionar. */
export const REQUIRED_TOOLS_MONTHLY: ToolId[] = ["documents.list", "documents.classify", "checklist.evaluate", "report.publish"];
