import Link from "next/link";
import { notFound } from "next/navigation";
import { getRunDetail } from "@/core/runtime/runs";
import { AppError } from "@/core/errors";
import { getDb, requirePageActor } from "@/lib/server/context";
import { brl, dt, PageTitle, Stamp, StatusStamp } from "@/components/ui";

const ACTION: Record<string, [string, "green" | "amber" | "red" | "gray"]> = {
  complete: ["completo", "green"],
  approval_requested: ["aguardando aprovação", "amber"],
  awaiting_approval: ["aguardando aprovação", "amber"],
  sent: ["lembrete enviado", "green"],
  already_sent: ["já enviado", "gray"],
  interval: ["dentro do intervalo", "gray"],
  max_reminders: ["limite de lembretes", "gray"],
  no_contact: ["sem contato", "red"],
  send_failed: ["envio falhou", "red"],
  draft_failed: ["lembrete rejeitado", "red"],
  no_reminders: ["sem lembretes", "gray"],
  not_processed: ["não processado", "gray"],
};

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageActor();
  const { id } = await params;
  let data;
  try {
    data = await getRunDetail(await getDb(), actor, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  }
  const { run, steps } = data;
  const s = run.summary;
  return (
    <div className="space-y-8">
      <PageTitle kicker={`Execução · competência ${run.competence}`} title={`Resultado da execução`}>
        <span className="flex flex-wrap items-center gap-3">
          <StatusStamp status={run.status} />
          {run.error_message && <span className="text-stamp">{run.error_message}</span>}
          <span className="num text-sm">{run.steps_used} passos · {brl(run.cost_cents)} · {dt(run.started_at)} → {dt(run.finished_at)}</span>
          {s?.simulatedModel && <Stamp tone="red">IA simulada</Stamp>}
        </span>
      </PageTitle>

      {s && (
        <section>
          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ["Empresas", s.totals.clients],
              ["Completas", s.totals.complete],
              ["Com pendência", s.totals.withPending],
              ["Aprovações pedidas", s.totals.approvalsRequested],
            ].map(([l, v]) => (
              <div key={l} className="card p-4">
                <p className="label">{l}</p>
                <p className="num text-3xl font-semibold">{v}</p>
              </div>
            ))}
          </div>
          <table className="ledger">
            <thead><tr><th>Empresa-cliente</th><th>Pendências</th><th>Erros de classificação</th><th>Ação</th></tr></thead>
            <tbody>
              {s.clients.map((c) => {
                const [label, tone] = ACTION[c.action] ?? [c.action, "gray"];
                return (
                  <tr key={c.clientId}>
                    <td className="font-medium">{c.clientName}</td>
                    <td className="text-sm">{c.missing.length ? c.missing.join(", ") : "—"}</td>
                    <td className="num">{c.classificationErrors}</td>
                    <td><Stamp tone={tone}>{label}</Stamp></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Linha do tempo de passos</h2>
        <ol className="space-y-1">
          {steps.map((st) => (
            <li key={st.seq} className="num flex gap-3 border-b border-rule py-1 text-xs">
              <span className="w-8 text-muted">{String(st.seq).padStart(2, "0")}</span>
              <span className="w-40">{st.tool}</span>
              <span className={st.status === "ok" ? "text-ledger" : "text-stamp"}>{st.status}</span>
              <span className="truncate text-muted">{JSON.stringify(st.detail)}</span>
            </li>
          ))}
        </ol>
      </section>
      <Link href={`/painel/instalacoes/${run.installation_id}`} className="btn btn-ghost">Voltar para a instalação</Link>
    </div>
  );
}
