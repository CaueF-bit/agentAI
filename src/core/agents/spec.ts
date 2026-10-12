import { z } from "zod";
import { REQUIRED_TOOLS_MONTHLY, TOOL_IDS } from "./tools";

// Este módulo também é usado no navegador (editor): não importar nada de node:* aqui.

// Especificação estruturada de um agente. Tudo que a IA construtora gera passa por aqui.
// .strict() rejeita campos desconhecidos (ex.: "price", "role", "permissions").

export const DOC_TYPES = [
  "extrato_bancario",
  "nota_fiscal_entrada",
  "nota_fiscal_saida",
  "folha_pagamento",
  "guia_imposto",
  "contrato_social",
  "outro",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  extrato_bancario: "Extrato bancário",
  nota_fiscal_entrada: "Notas fiscais de entrada",
  nota_fiscal_saida: "Notas fiscais de saída",
  folha_pagamento: "Folha de pagamento",
  guia_imposto: "Guia de imposto paga",
  contrato_social: "Contrato social / alteração",
  outro: "Outro",
};

export const TAX_REGIMES = ["mei", "simples", "presumido", "real"] as const;
export type TaxRegime = (typeof TAX_REGIMES)[number];

/** Tetos da plataforma: nenhuma especificação pode pedir mais que isso. */
export const PLATFORM_LIMITS = {
  maxStepsPerRun: 500,
  maxToolCallsPerRun: 1000,
  runTimeoutSeconds: 900,
  maxCostCentsPerRun: 5000,
  maxRemindersPerClient: 5,
} as const;

const ChecklistItem = z
  .object({
    key: z.string().regex(/^[a-z0-9_]{2,40}$/, "use letras minúsculas, números e _"),
    label: z.string().trim().min(3).max(80),
    docType: z.enum(DOC_TYPES),
    required: z.boolean(),
    appliesTo: z.array(z.enum(TAX_REGIMES)).min(1).max(4),
  })
  .strict();

export const AgentSpecSchema = z
  .object({
    schemaVersion: z.literal(1),
    name: z.string().trim().min(3).max(80),
    summary: z.string().trim().min(10).max(300),
    niche: z.literal("contabilidade"),
    workflow: z.literal("monthly_document_collection"),
    checklist: z.array(ChecklistItem).min(1).max(20),
    schedule: z
      .object({
        startDay: z.number().int().min(1).max(28),
        deadlineDay: z.number().int().min(1).max(28),
      })
      .strict(),
    reminders: z
      .object({
        channel: z.enum(["email", "whatsapp"]),
        maxPerClient: z.number().int().min(0).max(PLATFORM_LIMITS.maxRemindersPerClient),
        intervalDays: z.number().int().min(1).max(10),
        tone: z.enum(["formal", "cordial"]),
      })
      .strict(),
    tools: z.array(z.enum(TOOL_IDS)).min(1).max(TOOL_IDS.length),
    approvals: z.object({ sendMessages: z.enum(["always", "first_contact", "never"]) }).strict(),
    limits: z
      .object({
        maxStepsPerRun: z.number().int().min(1).max(PLATFORM_LIMITS.maxStepsPerRun),
        maxToolCallsPerRun: z.number().int().min(1).max(PLATFORM_LIMITS.maxToolCallsPerRun),
        runTimeoutSeconds: z.number().int().min(10).max(PLATFORM_LIMITS.runTimeoutSeconds),
        maxCostCentsPerRun: z.number().int().min(1).max(PLATFORM_LIMITS.maxCostCentsPerRun),
      })
      .strict(),
  })
  .strict();

export type AgentSpec = z.infer<typeof AgentSpecSchema>;

export interface SpecIssue {
  path: string;
  message: string;
}

export type SpecValidation = { ok: true; spec: AgentSpec } | { ok: false; issues: SpecIssue[] };

/** Validação determinística: esquema + regras de negócio. Saída de IA nunca é confiável. */
export function validateSpec(raw: unknown): SpecValidation {
  const parsed = AgentSpecSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({ path: i.path.join(".") || "(raiz)", message: i.message })),
    };
  }
  const spec = parsed.data;
  const issues: SpecIssue[] = [];

  if (new Set(spec.tools).size !== spec.tools.length) issues.push({ path: "tools", message: "ferramentas duplicadas" });
  for (const t of REQUIRED_TOOLS_MONTHLY) {
    if (!spec.tools.includes(t)) issues.push({ path: "tools", message: `o fluxo exige a ferramenta ${t}` });
  }
  if (spec.reminders.maxPerClient > 0) {
    for (const t of ["messages.draft", "messages.send"] as const) {
      if (!spec.tools.includes(t)) issues.push({ path: "tools", message: `lembretes ativos exigem a ferramenta ${t}` });
    }
  }
  const keys = spec.checklist.map((c) => c.key);
  if (new Set(keys).size !== keys.length) issues.push({ path: "checklist", message: "chaves repetidas na lista de documentos" });
  if (!spec.checklist.some((c) => c.required)) issues.push({ path: "checklist", message: "ao menos um documento deve ser obrigatório" });
  if (spec.schedule.deadlineDay < spec.schedule.startDay) {
    issues.push({ path: "schedule.deadlineDay", message: "o prazo deve ser igual ou posterior ao dia de início" });
  }
  if (spec.limits.maxToolCallsPerRun < spec.limits.maxStepsPerRun) {
    issues.push({ path: "limits.maxToolCallsPerRun", message: "deve ser maior ou igual ao limite de passos" });
  }
  return issues.length ? { ok: false, issues } : { ok: true, spec };
}

/** Especificação padrão segura usada como base pela IA construtora simulada. */
export function defaultSpec(): AgentSpec {
  return {
    schemaVersion: 1,
    name: "Fechamento Mensal",
    summary: "Cobra, recebe e confere os documentos do fechamento mensal de cada empresa-cliente.",
    niche: "contabilidade",
    workflow: "monthly_document_collection",
    checklist: [
      { key: "extrato", label: "Extrato bancário do mês", docType: "extrato_bancario", required: true, appliesTo: ["simples", "presumido", "real"] },
      { key: "nf_saida", label: "Notas fiscais de saída", docType: "nota_fiscal_saida", required: true, appliesTo: ["mei", "simples", "presumido", "real"] },
      { key: "nf_entrada", label: "Notas fiscais de entrada", docType: "nota_fiscal_entrada", required: true, appliesTo: ["simples", "presumido", "real"] },
    ],
    schedule: { startDay: 1, deadlineDay: 10 },
    reminders: { channel: "email", maxPerClient: 3, intervalDays: 3, tone: "cordial" },
    tools: ["documents.list", "documents.classify", "checklist.evaluate", "messages.draft", "messages.send", "report.publish"],
    approvals: { sendMessages: "always" },
    limits: { maxStepsPerRun: 200, maxToolCallsPerRun: 400, runTimeoutSeconds: 300, maxCostCentsPerRun: 1500 },
  };
}
