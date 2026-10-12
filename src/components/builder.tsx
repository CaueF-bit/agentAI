"use client";

import { useActionState } from "react";
import { builderGenerateAction, createDefinitionAction, type BuilderState } from "@/app/actions";
import { SpecEditor } from "./spec-editor";

const EXAMPLE =
  "Quero um agente que cobre o extrato bancário, as notas de entrada e as notas de saída dos meus clientes do Simples até o dia 10, por e-mail, a cada 3 dias, no máximo 3 lembretes, em tom cordial e com aprovação antes de enviar.";

export function Builder() {
  const [state, generate, pending] = useActionState<BuilderState, FormData>(builderGenerateAction, {
    description: "",
    spec: null,
    questions: [],
    issues: [],
    simulated: true,
  });

  return (
    <div className="space-y-10">
      <form action={generate} className="card space-y-4 p-6">
        <label>
          <span className="label">Descreva o trabalho que o agente deve fazer</span>
          <textarea name="description" rows={5} className="field" defaultValue={state.description || EXAMPLE} />
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <button className="btn btn-primary" disabled={pending}>{pending ? "Montando…" : "Montar especificação"}</button>
          <span className="text-xs text-muted">
            A descrição inicia a configuração, mas não substitui revisão, permissões e testes.
          </span>
        </div>
      </form>

      {state.error && <p className="rounded border border-stamp bg-stamp-wash px-4 py-3 text-sm text-stamp">{state.error}</p>}

      {state.issues.length > 0 && (
        <div className="rounded border border-stamp bg-stamp-wash p-4 text-sm text-stamp">
          <p className="font-semibold">A especificação gerada foi rejeitada pela validação:</p>
          <ul className="mt-2 list-disc pl-5">
            {state.issues.map((i, k) => <li key={k}><code>{i.path}</code>: {i.message}</li>)}
          </ul>
        </div>
      )}

      {state.spec && (
        <div className="rise space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-semibold">Especificação proposta</h2>
            {state.simulated && <span className="stamp text-stamp">IA simulada (regras)</span>}
          </div>
          {state.questions.length > 0 && (
            <div className="border-l-4 border-amber bg-amber-wash p-4">
              <p className="font-semibold">Informações que faltaram. Ajuste os campos abaixo:</p>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {state.questions.map((q) => <li key={q}>{q}</li>)}
              </ul>
            </div>
          )}
          <SpecEditor key={JSON.stringify(state.spec)} initial={state.spec} action={createDefinitionAction} submitLabel="Salvar rascunho" />
        </div>
      )}
    </div>
  );
}
