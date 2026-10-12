"use client";

import { useState } from "react";
import { DOC_TYPES, DOC_TYPE_LABELS, TAX_REGIMES, type AgentSpec } from "@/core/agents/spec";
import { TOOL_IDS, TOOLS } from "@/core/agents/tools";

// Editor estruturado. Só monta o JSON: TODA validação acontece no servidor (validateSpec).

export function SpecEditor({
  initial,
  action,
  hidden = {},
  submitLabel,
}: {
  initial: AgentSpec;
  action: (formData: FormData) => void | Promise<void>;
  hidden?: Record<string, string>;
  submitLabel: string;
}) {
  const [spec, setSpec] = useState<AgentSpec>(initial);
  const set = <K extends keyof AgentSpec>(k: K, v: AgentSpec[K]) => setSpec((s) => ({ ...s, [k]: v }));
  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <form action={action} className="space-y-8">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input type="hidden" name="spec" value={JSON.stringify(spec)} />

      <section className="grid gap-4 md:grid-cols-2">
        <label className="md:col-span-1">
          <span className="label">Nome do agente</span>
          <input className="field" value={spec.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className="md:col-span-2">
          <span className="label">Resumo para o catálogo</span>
          <textarea className="field" rows={2} value={spec.summary} onChange={(e) => set("summary", e.target.value)} />
        </label>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Lista de documentos</h3>
          <button
            type="button"
            className="text-sm font-semibold text-ledger underline"
            onClick={() =>
              set("checklist", [...spec.checklist, { key: `item_${spec.checklist.length + 1}`, label: "Novo documento", docType: "outro", required: true, appliesTo: ["simples"] }])
            }
          >
            + adicionar documento
          </button>
        </div>
        <table className="ledger">
          <thead>
            <tr><th>Chave</th><th>Descrição</th><th>Tipo</th><th>Regimes</th><th>Obrig.</th><th /></tr>
          </thead>
          <tbody>
            {spec.checklist.map((c, i) => {
              const upd = (patch: Partial<typeof c>) => set("checklist", spec.checklist.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <tr key={i}>
                  <td><input className="field num !w-28" value={c.key} onChange={(e) => upd({ key: e.target.value })} /></td>
                  <td><input className="field" value={c.label} onChange={(e) => upd({ label: e.target.value })} /></td>
                  <td>
                    <select className="field" value={c.docType} onChange={(e) => upd({ docType: e.target.value as typeof c.docType })}>
                      {DOC_TYPES.map((t) => <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>)}
                    </select>
                  </td>
                  <td className="whitespace-nowrap text-xs">
                    {TAX_REGIMES.map((r) => (
                      <label key={r} className="mr-2 inline-flex items-center gap-1 uppercase">
                        <input
                          type="checkbox"
                          checked={c.appliesTo.includes(r)}
                          onChange={(e) => upd({ appliesTo: e.target.checked ? [...c.appliesTo, r] : c.appliesTo.filter((x) => x !== r) })}
                        />
                        {r}
                      </label>
                    ))}
                  </td>
                  <td><input type="checkbox" checked={c.required} onChange={(e) => upd({ required: e.target.checked })} /></td>
                  <td>
                    <button type="button" className="text-xs text-stamp underline" onClick={() => set("checklist", spec.checklist.filter((_, j) => j !== i))}>
                      remover
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <label>
          <span className="label">Dia de início</span>
          <input type="number" className="field num" value={spec.schedule.startDay} onChange={(e) => set("schedule", { ...spec.schedule, startDay: num(e.target.value) })} />
        </label>
        <label>
          <span className="label">Prazo (dia)</span>
          <input type="number" className="field num" value={spec.schedule.deadlineDay} onChange={(e) => set("schedule", { ...spec.schedule, deadlineDay: num(e.target.value) })} />
        </label>
        <label>
          <span className="label">Canal</span>
          <select className="field" value={spec.reminders.channel} onChange={(e) => set("reminders", { ...spec.reminders, channel: e.target.value as "email" | "whatsapp" })}>
            <option value="email">E-mail</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </label>
        <label>
          <span className="label">Tom</span>
          <select className="field" value={spec.reminders.tone} onChange={(e) => set("reminders", { ...spec.reminders, tone: e.target.value as "formal" | "cordial" })}>
            <option value="cordial">Cordial</option>
            <option value="formal">Formal</option>
          </select>
        </label>
        <label>
          <span className="label">Lembretes por cliente</span>
          <input type="number" className="field num" value={spec.reminders.maxPerClient} onChange={(e) => set("reminders", { ...spec.reminders, maxPerClient: num(e.target.value) })} />
        </label>
        <label>
          <span className="label">Intervalo (dias)</span>
          <input type="number" className="field num" value={spec.reminders.intervalDays} onChange={(e) => set("reminders", { ...spec.reminders, intervalDays: num(e.target.value) })} />
        </label>
        <label className="md:col-span-2">
          <span className="label">Aprovação de mensagens</span>
          <select className="field" value={spec.approvals.sendMessages} onChange={(e) => set("approvals", { sendMessages: e.target.value as AgentSpec["approvals"]["sendMessages"] })}>
            <option value="always">Sempre aprovar antes de enviar</option>
            <option value="first_contact">Aprovar só o primeiro contato</option>
            <option value="never">Enviar sem aprovação</option>
          </select>
        </label>
      </section>

      <section>
        <h3 className="mb-2 text-xl font-semibold">Ferramentas permitidas</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TOOL_IDS.map((t) => (
            <label key={t} className="flex items-start gap-2 rounded border border-rule bg-card p-3 text-sm">
              <input
                type="checkbox"
                checked={spec.tools.includes(t)}
                onChange={(e) => set("tools", e.target.checked ? [...spec.tools, t] : spec.tools.filter((x) => x !== t))}
              />
              <span>
                <span className="font-semibold">{TOOLS[t].label}</span>
                <span className="block text-xs text-muted">{t}{TOOLS[t].externalSideEffect ? " · ação externa" : ""}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {(
          [
            ["maxStepsPerRun", "Máx. de passos"],
            ["maxToolCallsPerRun", "Máx. de chamadas"],
            ["runTimeoutSeconds", "Tempo máx. (s)"],
            ["maxCostCentsPerRun", "Custo máx. (centavos)"],
          ] as const
        ).map(([k, l]) => (
          <label key={k}>
            <span className="label">{l}</span>
            <input type="number" className="field num" value={spec.limits[k]} onChange={(e) => set("limits", { ...spec.limits, [k]: num(e.target.value) })} />
          </label>
        ))}
      </section>

      <div className="flex items-center gap-4 border-t border-rule pt-6">
        <button className="btn btn-primary">{submitLabel}</button>
        <span className="text-xs text-muted">O servidor valida esquema, regras do fluxo e tetos da plataforma antes de salvar.</span>
      </div>
    </form>
  );
}
