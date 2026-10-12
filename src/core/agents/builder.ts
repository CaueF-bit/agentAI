import { AppError } from "../errors";
import { BuilderOutputSchema, type ModelProvider, type ModelUsage } from "../ai/provider";
import { validateSpec, type AgentSpec, type SpecIssue } from "./spec";

export type BuildResult =
  | { ok: true; spec: AgentSpec; questions: string[]; usage: ModelUsage; simulated: boolean }
  | { ok: false; issues: SpecIssue[]; questions: string[]; usage: ModelUsage | null; simulated: boolean };

/**
 * IA construtora: descrição em linguagem natural → especificação + perguntas pendentes.
 * A saída do modelo é tratada como não confiável e validada pelo mesmo validador usado
 * em edições manuais e na publicação. Especificação inválida não é salva.
 */
export async function buildFromDescription(provider: ModelProvider, description: string): Promise<BuildResult> {
  const text = description.trim();
  if (text.length < 20 || text.length > 4000) {
    throw new AppError("validation", "Descreva o agente com 20 a 4000 caracteres.");
  }
  let result;
  try {
    result = await provider.generateSpec(text);
  } catch {
    return { ok: false, issues: [{ path: "(modelo)", message: "o modelo não respondeu; tente novamente" }], questions: [], usage: null, simulated: provider.simulated };
  }
  const envelope = BuilderOutputSchema.safeParse(result.output);
  if (!envelope.success) {
    return { ok: false, issues: [{ path: "(saída do modelo)", message: "formato inesperado" }], questions: [], usage: result.usage, simulated: provider.simulated };
  }
  const v = validateSpec(envelope.data.spec);
  if (!v.ok) {
    return { ok: false, issues: v.issues, questions: envelope.data.questions, usage: result.usage, simulated: provider.simulated };
  }
  return { ok: true, spec: v.spec, questions: envelope.data.questions, usage: result.usage, simulated: provider.simulated };
}
