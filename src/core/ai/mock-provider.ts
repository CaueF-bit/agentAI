import { defaultSpec, DOC_TYPE_LABELS, type AgentSpec, type DocType, type TaxRegime } from "../agents/spec";
import { estimateTokens, type ClassifyInput, type DraftInput, type ModelProvider, type ProviderResult } from "./provider";

// Provedor SIMULADO e determinístico (modo demonstração). Não é um modelo de linguagem:
// usa regras por palavra-chave. Serve para testes determinísticos e para a demo sem credenciais.
// O que os testes com este provedor comprovam: validação, permissões, limites e fluxo —
// NÃO a qualidade de um modelo real (ver docs/technical/evaluations.md).

const MODEL = "mock-rules-v1";

const ALL: TaxRegime[] = ["mei", "simples", "presumido", "real"];
const NO_MEI: TaxRegime[] = ["simples", "presumido", "real"];

const DOC_RULES: { re: RegExp; docType: DocType; key: string; appliesTo: TaxRegime[] }[] = [
  { re: /extrato/i, docType: "extrato_bancario", key: "extrato", appliesTo: NO_MEI },
  { re: /notas?( fiscais)? de entrada|compras/i, docType: "nota_fiscal_entrada", key: "nf_entrada", appliesTo: NO_MEI },
  { re: /notas?( fiscais)? de sa[ií]da|vendas|faturamento/i, docType: "nota_fiscal_saida", key: "nf_saida", appliesTo: ALL },
  { re: /folha|holerite|pr[oó]-?labore/i, docType: "folha_pagamento", key: "folha", appliesTo: NO_MEI },
  { re: /guias?|das\b|darf/i, docType: "guia_imposto", key: "guia", appliesTo: ALL },
  { re: /contrato social/i, docType: "contrato_social", key: "contrato", appliesTo: ALL },
];

function usage(input: string, output: unknown): ProviderResult["usage"] {
  return { model: MODEL, inputTokens: estimateTokens(input), outputTokens: estimateTokens(JSON.stringify(output)) };
}

export function mockGenerate(description: string): { spec: AgentSpec; questions: string[] } {
  const d = description;
  const spec = defaultSpec();
  const questions: string[] = [];

  const items = DOC_RULES.filter((r) => r.re.test(d));
  if (/notas fiscais|\bnotas\b/i.test(d) && !items.some((i) => i.key.startsWith("nf_"))) {
    items.push(DOC_RULES[1], DOC_RULES[2]);
  }
  if (items.length) {
    spec.checklist = items.map((r) => ({
      key: r.key,
      label: DOC_TYPE_LABELS[r.docType],
      docType: r.docType,
      required: true,
      appliesTo: r.appliesTo,
    }));
  } else {
    questions.push("Quais documentos o agente deve cobrar de cada empresa-cliente (extrato, notas de entrada/saída, folha…)?");
  }

  if (/whats/i.test(d)) spec.reminders.channel = "whatsapp";
  else if (/e-?mail/i.test(d)) spec.reminders.channel = "email";
  else questions.push("Por qual canal os lembretes devem ser enviados: e-mail ou WhatsApp?");

  const deadline = d.match(/at[eé] (?:o )?dia (\d{1,2})/i);
  if (deadline) spec.schedule.deadlineDay = Math.min(28, Math.max(1, Number(deadline[1])));
  else questions.push("Até que dia do mês os documentos precisam chegar?");

  const start = d.match(/(?:a partir do|come[cç]ando no|iniciar no) dia (\d{1,2})/i);
  if (start) spec.schedule.startDay = Math.min(28, Math.max(1, Number(start[1])));

  const every = d.match(/a cada (\d{1,2}) dias?/i);
  if (every) spec.reminders.intervalDays = Math.min(10, Math.max(1, Number(every[1])));

  const max = d.match(/(?:no m[aá]ximo|at[eé]) (\d) (?:lembretes|vezes)/i);
  if (max) spec.reminders.maxPerClient = Math.min(5, Number(max[1]));

  if (/formal/i.test(d)) spec.reminders.tone = "formal";

  if (/sem aprova/i.test(d)) spec.approvals.sendMessages = "never";
  else if (/primeir[oa] (?:contato|mensagem)/i.test(d)) spec.approvals.sendMessages = "first_contact";
  else if (/aprova/i.test(d)) spec.approvals.sendMessages = "always";
  else questions.push("As mensagens precisam de aprovação de alguém do escritório antes do envio?");

  const firstSentence = d.split(/[.!?\n]/)[0]?.trim() ?? "";
  if (firstSentence.length >= 10) spec.summary = firstSentence.slice(0, 300);
  return { spec, questions };
}

export function mockClassify(input: ClassifyInput): { docType: DocType; confidence: number } {
  const text = `${input.filename}\n${input.content}`.toLowerCase();
  const rules: [RegExp, DocType][] = [
    [/extrato/, "extrato_bancario"],
    [/(nf-?e|nota).*(entrada|compra)|(entrada|compra).*(nf-?e|nota)/, "nota_fiscal_entrada"],
    [/(nf-?e|nota).*(sa[ií]da|venda)|(sa[ií]da|venda).*(nf-?e|nota)/, "nota_fiscal_saida"],
    [/folha|holerite/, "folha_pagamento"],
    [/\bdas\b|darf|guia/, "guia_imposto"],
    [/contrato social/, "contrato_social"],
  ];
  // Só o NOME do arquivo decide com confiança alta; conteúdo é sinal secundário.
  for (const [re, t] of rules) if (re.test(input.filename.toLowerCase())) return { docType: t, confidence: 0.9 };
  for (const [re, t] of rules) if (re.test(text)) return { docType: t, confidence: 0.6 };
  return { docType: "outro", confidence: 0.4 };
}

export function mockDraft(input: DraftInput): { body: string } {
  const list = input.missingLabels.map((l) => `• ${l}`).join("\n");
  const [y, m] = input.competence.split("-");
  const comp = `${m}/${y}`;
  const body =
    input.tone === "formal"
      ? `Prezado(a) cliente ${input.clientName},\n\nPara concluirmos o fechamento da competência ${comp}, solicitamos o envio dos seguintes documentos até o dia ${input.deadlineDay}:\n${list}\n\nAtenciosamente,\n${input.firmName}`
      : `Olá, ${input.clientName}! Tudo bem?\n\nPara fecharmos ${comp}, ainda faltam:\n${list}\n\nConsegue enviar até o dia ${input.deadlineDay}? Obrigado!\n${input.firmName}`;
  return { body };
}

export class MockProvider implements ModelProvider {
  readonly id = "mock" as const;
  readonly simulated = true;

  async generateSpec(description: string): Promise<ProviderResult> {
    const output = mockGenerate(description);
    return { output, usage: usage(description, output) };
  }

  async classifyDocument(input: ClassifyInput): Promise<ProviderResult> {
    const output = mockClassify(input);
    return { output, usage: usage(input.filename + input.content.slice(0, 4000), output) };
  }

  async draftReminder(input: DraftInput): Promise<ProviderResult> {
    const output = mockDraft(input);
    return { output, usage: usage(JSON.stringify(input), output) };
  }
}
