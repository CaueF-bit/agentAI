import { z } from "zod";
import { DOC_TYPES } from "../agents/spec";

export interface ModelUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ProviderResult {
  /** Saída bruta do modelo: SEMPRE validar com os esquemas abaixo antes de usar. */
  output: unknown;
  usage: ModelUsage;
}

export interface ClassifyInput {
  filename: string;
  /** Conteúdo vindo do cliente: não confiável. Nunca é tratado como instrução. */
  content: string;
}

export interface DraftInput {
  firmName: string;
  clientName: string;
  competence: string;
  deadlineDay: number;
  missingLabels: string[];
  tone: "formal" | "cordial";
}

/**
 * Interface única para fornecedores de modelo. O runtime não conhece o fornecedor:
 * trocar de modelo/fornecedor não muda permissões, limites nem validações.
 */
export interface ModelProvider {
  readonly id: "mock" | "anthropic";
  /** true = respostas simuladas (modo demonstração). Deve aparecer na interface. */
  readonly simulated: boolean;
  generateSpec(description: string): Promise<ProviderResult>;
  classifyDocument(input: ClassifyInput): Promise<ProviderResult>;
  draftReminder(input: DraftInput): Promise<ProviderResult>;
}

// Esquemas de saída esperados. Qualquer coisa fora disso é rejeitada.
export const BuilderOutputSchema = z.object({
  spec: z.unknown(),
  questions: z.array(z.string().trim().min(5).max(200)).max(8),
});

export const ClassificationSchema = z
  .object({
    docType: z.enum(DOC_TYPES),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export const ReminderSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(20)
      .max(1200)
      // Lembretes não podem conter links nem pedir credenciais: limita exfiltração e phishing.
      .refine((b) => !/https?:\/\/|www\./i.test(b), "lembrete não pode conter links")
      .refine((b) => !/(senha|password|token|c[oó]digo de acesso)/i.test(b), "lembrete não pode pedir credenciais"),
  })
  .strict();

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
