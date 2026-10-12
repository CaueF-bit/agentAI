import { ClassificationSchema, ReminderSchema, type ModelProvider } from "../ai/provider";
import type { AgentSpec, DocType, TaxRegime } from "../agents/spec";
import { TOOLS, type ToolId } from "../agents/tools";
import { costCentsFromUsage } from "./costs";

// Motor do Agente de Fechamento Mensal. Orquestração DETERMINÍSTICA em código: o modelo
// só classifica documentos e redige textos. Quem decide o que executar, com qual
// permissão e até qual limite é este motor — não o modelo nem o conteúdo dos documentos.

export interface ClientInfo {
  id: string;
  name: string;
  taxRegime: TaxRegime;
  contactEmail: string | null;
  contactPhone: string | null;
}

export interface DocInfo {
  id: string;
  filename: string;
  content: string;
  classifiedType: DocType | null;
}

export interface SendParams {
  idempotencyKey: string;
  clientCompanyId: string;
  clientName: string;
  channel: "email" | "whatsapp";
  to: string;
  body: string;
  competence: string;
  reminderNumber: number;
}

export type SendResult = "sent" | "already_sent" | "failed";

export interface ReminderState {
  sentCount: number;
  lastSentAt: number | null;
  pendingApproval: boolean;
}

/** Portas que o motor usa. Implementações: banco (produção/demo) e sandbox (memória). */
export interface RunEnvironment {
  checkRunnable(): Promise<null | "paused" | "kill_switch">;
  listClients(): Promise<ClientInfo[]>;
  listDocuments(clientId: string): Promise<DocInfo[]>;
  saveClassification(docId: string, docType: DocType): Promise<void>;
  reminderState(clientId: string): Promise<ReminderState>;
  reserveBudget(cents: number): Promise<boolean>;
  settleBudget(reservedCents: number, actualCents: number, usage: { kind: "model" | "channel"; detail: string }): Promise<number>;
  requestApproval(p: SendParams): Promise<void>;
  sendMessage(p: SendParams): Promise<SendResult>;
  recordStep(tool: string, status: "ok" | "denied" | "error", detail: Record<string, unknown>): Promise<void>;
}

export type ClientAction =
  | "complete"
  | "no_reminders"
  | "awaiting_approval"
  | "approval_requested"
  | "max_reminders"
  | "interval"
  | "no_contact"
  | "sent"
  | "already_sent"
  | "send_failed"
  | "draft_failed"
  | "not_processed";

export interface ClientSummary {
  clientId: string;
  clientName: string;
  missing: string[];
  classificationErrors: number;
  action: ClientAction;
}

export interface RunSummary {
  competence: string;
  simulatedModel: boolean;
  clients: ClientSummary[];
  totals: { clients: number; complete: number; withPending: number; messagesSent: number; approvalsRequested: number };
}

export type RunStatus = "succeeded" | "failed" | "cancelled" | "budget_blocked";

export interface RunOutcome {
  status: RunStatus;
  errorCode: string | null;
  errorMessage: string | null;
  steps: number;
  toolCalls: number;
  costCents: number;
  summary: RunSummary;
}

export interface EngineInput {
  spec: AgentSpec;
  competence: string;
  firmName: string;
  approvalPolicy: "always" | "first_contact" | "never";
  provider: ModelProvider;
  env: RunEnvironment;
  pricingModel: string;
  now?: () => number;
}

class StopRun extends Error {
  constructor(
    readonly status: RunStatus,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
class ToolFailed extends Error {}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function runMonthlyCollection(input: EngineInput): Promise<RunOutcome> {
  const { spec, env, provider } = input;
  const now = input.now ?? Date.now;
  const startedAt = now();
  let steps = 0;
  let toolCalls = 0;
  let costCents = 0;
  const clientsSummary: ClientSummary[] = [];

  /** Porta única de execução de ferramentas: permissão, limites, pausa e orçamento. */
  async function callTool<T>(
    tool: ToolId,
    fn: () => Promise<{ value: T; actualCents: number; detail: Record<string, unknown> }>,
    opts: { reserve?: boolean } = {},
  ): Promise<T> {
    if (!spec.tools.includes(tool) || !TOOLS[tool]) {
      await env.recordStep(tool, "denied", { reason: "tool_not_allowed" });
      throw new StopRun("failed", "tool_not_allowed", `Ferramenta não permitida: ${tool}`);
    }
    if (steps >= spec.limits.maxStepsPerRun) throw new StopRun("failed", "limit_steps", "Limite de passos atingido.");
    if (toolCalls >= spec.limits.maxToolCallsPerRun) throw new StopRun("failed", "limit_tool_calls", "Limite de chamadas atingido.");
    if (now() - startedAt > spec.limits.runTimeoutSeconds * 1000) throw new StopRun("failed", "timeout", "Tempo máximo da execução atingido.");
    const blocked = await env.checkRunnable();
    if (blocked) throw new StopRun("cancelled", blocked, blocked === "paused" ? "Agente pausado." : "Execuções interrompidas pela plataforma.");

    steps++;
    toolCalls++;
    const meta = TOOLS[tool];
    const reserveCents = opts.reserve === false ? 0 : meta.estimatedCostCents;
    if (reserveCents > 0) {
      if (costCents + reserveCents > spec.limits.maxCostCentsPerRun) {
        throw new StopRun("failed", "limit_run_cost", "Custo máximo por execução atingido.");
      }
      if (!(await env.reserveBudget(reserveCents))) {
        await env.recordStep(tool, "denied", { reason: "budget_exceeded" });
        throw new StopRun("budget_blocked", "budget_exceeded", "Orçamento do período esgotado.");
      }
    }
    try {
      const r = await fn();
      if (reserveCents > 0) costCents += await env.settleBudget(reserveCents, r.actualCents, { kind: meta.usesModel ? "model" : "channel", detail: tool });
      await env.recordStep(tool, "ok", r.detail);
      return r.value;
    } catch (e) {
      if (e instanceof StopRun) throw e;
      // Saída inválida tem custo conhecido; falha sem resposta pode ter sido cobrada pelo
      // fornecedor, então debita o reservado (conservador).
      const known = (e as { actualCents?: unknown }).actualCents;
      const actual = typeof known === "number" ? known : meta.usesModel ? reserveCents : 0;
      if (reserveCents > 0) costCents += await env.settleBudget(reserveCents, actual, { kind: meta.usesModel ? "model" : "channel", detail: `${tool}:error` });
      await env.recordStep(tool, "error", { error: e instanceof Error ? e.message.slice(0, 200) : "erro" });
      throw new ToolFailed(tool);
    }
  }

  let outcome: { status: RunStatus; code: string | null; message: string | null } = { status: "succeeded", code: null, message: null };

  try {
    const clients = await env.listClients();
    for (const c of clients) clientsSummary.push({ clientId: c.id, clientName: c.name, missing: [], classificationErrors: 0, action: "not_processed" });

    for (const [i, client] of clients.entries()) {
      const summary = clientsSummary[i];
      const docs = await callTool("documents.list", async () => {
        const d = await env.listDocuments(client.id);
        return { value: d, actualCents: 0, detail: { client: client.id, documents: d.length } };
      });

      for (const doc of docs.filter((d) => !d.classifiedType)) {
        try {
          await callTool("documents.classify", async () => {
            // Conteúdo do documento é NÃO CONFIÁVEL: vai só para classificação, cuja saída é um enum.
            const r = await provider.classifyDocument({ filename: doc.filename, content: doc.content });
            const actualCents = costCentsFromUsage(r.usage, input.pricingModel);
            const parsed = ClassificationSchema.safeParse(r.output);
            if (!parsed.success) throw Object.assign(new Error("saída do modelo inválida"), { actualCents });
            await env.saveClassification(doc.id, parsed.data.docType);
            doc.classifiedType = parsed.data.docType;
            return { value: null, actualCents, detail: { document: doc.id, docType: parsed.data.docType } };
          });
        } catch (e) {
          if (e instanceof ToolFailed) summary.classificationErrors++;
          else throw e;
        }
      }

      const missing = await callTool("checklist.evaluate", async () => {
        const received = new Set(docs.map((d) => d.classifiedType).filter(Boolean));
        const m = spec.checklist
          .filter((item) => item.required && item.appliesTo.includes(client.taxRegime) && !received.has(item.docType))
          .map((item) => item.label);
        return { value: m, actualCents: 0, detail: { client: client.id, missing: m.length } };
      });
      summary.missing = missing;

      if (missing.length === 0) {
        summary.action = "complete";
        continue;
      }
      if (spec.reminders.maxPerClient === 0) {
        summary.action = "no_reminders";
        continue;
      }
      const state = await env.reminderState(client.id);
      if (state.pendingApproval) {
        summary.action = "awaiting_approval";
        continue;
      }
      if (state.sentCount >= spec.reminders.maxPerClient) {
        summary.action = "max_reminders";
        continue;
      }
      if (state.lastSentAt && now() - state.lastSentAt < spec.reminders.intervalDays * DAY_MS) {
        summary.action = "interval";
        continue;
      }
      const to = spec.reminders.channel === "email" ? client.contactEmail : client.contactPhone;
      if (!to) {
        summary.action = "no_contact";
        continue;
      }

      let body: string;
      try {
        body = await callTool("messages.draft", async () => {
          const r = await provider.draftReminder({
            firmName: input.firmName,
            clientName: client.name,
            competence: input.competence,
            deadlineDay: spec.schedule.deadlineDay,
            missingLabels: missing,
            tone: spec.reminders.tone,
          });
          const actualCents = costCentsFromUsage(r.usage, input.pricingModel);
          const parsed = ReminderSchema.safeParse(r.output);
          if (!parsed.success) throw Object.assign(new Error("lembrete rejeitado pela validação"), { actualCents });
          return { value: parsed.data.body, actualCents, detail: { client: client.id, chars: parsed.data.body.length } };
        });
      } catch (e) {
        if (e instanceof ToolFailed) {
          summary.action = "draft_failed";
          continue;
        }
        throw e;
      }

      const reminderNumber = state.sentCount + 1;
      const params: SendParams = {
        idempotencyKey: `${input.competence}:${client.id}:reminder:${reminderNumber}`,
        clientCompanyId: client.id,
        clientName: client.name,
        channel: spec.reminders.channel,
        to,
        body,
        competence: input.competence,
        reminderNumber,
      };
      const needsApproval = input.approvalPolicy === "always" || (input.approvalPolicy === "first_contact" && state.sentCount === 0);
      if (needsApproval) {
        await callTool(
          "messages.send",
          async () => {
            await env.requestApproval(params);
            return { value: null, actualCents: 0, detail: { client: client.id, approval: "requested", key: params.idempotencyKey } };
          },
          { reserve: false },
        );
        summary.action = "approval_requested";
      } else {
        try {
          const result = await callTool("messages.send", async () => {
            const r = await env.sendMessage(params);
            return { value: r, actualCents: r === "sent" ? TOOLS["messages.send"].estimatedCostCents : 0, detail: { client: client.id, result: r, key: params.idempotencyKey } };
          });
          summary.action = result === "sent" ? "sent" : result === "already_sent" ? "already_sent" : "send_failed";
        } catch (e) {
          if (e instanceof ToolFailed) summary.action = "send_failed";
          else throw e;
        }
      }
    }

    await callTool("report.publish", async () => ({ value: null, actualCents: 0, detail: { clients: clients.length } }));
  } catch (e) {
    if (e instanceof StopRun) outcome = { status: e.status, code: e.code, message: e.message };
    else if (e instanceof ToolFailed) outcome = { status: "failed", code: "tool_failed", message: `Falha na ferramenta ${e.message}` };
    else outcome = { status: "failed", code: "internal_error", message: "Erro interno na execução." };
  }

  return {
    status: outcome.status,
    errorCode: outcome.code,
    errorMessage: outcome.message,
    steps,
    toolCalls,
    costCents,
    summary: {
      competence: input.competence,
      simulatedModel: provider.simulated,
      clients: clientsSummary,
      totals: {
        clients: clientsSummary.length,
        complete: clientsSummary.filter((c) => c.action === "complete").length,
        withPending: clientsSummary.filter((c) => c.missing.length > 0).length,
        messagesSent: clientsSummary.filter((c) => c.action === "sent").length,
        approvalsRequested: clientsSummary.filter((c) => c.action === "approval_requested").length,
      },
    },
  };
}
