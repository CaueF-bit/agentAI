"use client";

import { useActionState } from "react";
import { sandboxAction, type SandboxState } from "@/app/actions";

const ACTION_LABEL: Record<string, string> = {
  complete: "documentação completa",
  approval_requested: "lembrete enviado para aprovação",
  sent: "lembrete seria enviado",
  no_contact: "sem contato no canal",
  draft_failed: "lembrete rejeitado pela validação",
  no_reminders: "lembretes desativados",
  not_processed: "não processado",
};

export function SandboxPanel({ definitionId }: { definitionId: string }) {
  const [state, run, pending] = useActionState<SandboxState, FormData>(sandboxAction, { result: null });
  const r = state.result;
  return (
    <div className="card p-6">
      <form action={run} className="flex flex-wrap items-center justify-between gap-4">
        <input type="hidden" name="definitionId" value={definitionId} />
        <div>
          <h3 className="text-xl font-semibold">Teste em sandbox</h3>
          <p className="text-sm text-muted">Executa o rascunho salvo com 3 empresas fictícias, uma delas com um documento malicioso. Nada é enviado nem gravado.</p>
        </div>
        <button className="btn btn-ghost" disabled={pending}>{pending ? "Executando…" : "Executar teste"}</button>
      </form>
      {state.error && <p className="mt-4 text-sm text-stamp">{state.error}</p>}
      {r && (
        <div className="rise mt-6 space-y-4">
          <p className="text-sm">
            Resultado: <strong>{r.outcome.status}</strong>
            {r.outcome.errorCode ? ` (${r.outcome.errorCode})` : ""} · {r.outcome.steps} passos · custo estimado{" "}
            <span className="num">R$ {(r.outcome.costCents / 100).toFixed(2)}</span>
            {r.outcome.summary.simulatedModel && <span className="ml-2 stamp text-stamp">simulado</span>}
          </p>
          <table className="ledger">
            <thead><tr><th>Empresa (fictícia)</th><th>Pendências</th><th>Ação do agente</th></tr></thead>
            <tbody>
              {r.outcome.summary.clients.map((c) => (
                <tr key={c.clientId}>
                  <td>{c.clientName}</td>
                  <td className="text-sm">{c.missing.length ? c.missing.join(", ") : "—"}</td>
                  <td className="text-sm">{ACTION_LABEL[c.action] ?? c.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {[...r.approvalsThatWouldBeRequested, ...r.messagesThatWouldBeSent].slice(0, 1).map((m) => (
            <div key={m.idempotencyKey} className="border-l-2 border-ledger pl-4">
              <p className="label">Exemplo de lembrete para {m.clientName} ({m.to})</p>
              <pre className="whitespace-pre-wrap font-[family-name:var(--font-sans)] text-sm">{m.body}</pre>
            </div>
          ))}
          <details>
            <summary className="cursor-pointer text-sm font-semibold">Passos executados ({r.steps.length})</summary>
            <ol className="mt-2 space-y-1 text-xs">
              {r.steps.map((s, i) => (
                <li key={i} className="num">
                  {String(i + 1).padStart(2, "0")} · {s.tool} · <span className={s.status === "ok" ? "text-ledger" : "text-stamp"}>{s.status}</span>
                </li>
              ))}
            </ol>
          </details>
        </div>
      )}
    </div>
  );
}
