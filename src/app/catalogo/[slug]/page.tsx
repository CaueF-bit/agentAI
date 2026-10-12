import { notFound } from "next/navigation";
import { getListingBySlug } from "@/core/catalog/catalog";
import { DOC_TYPE_LABELS } from "@/core/agents/spec";
import { TOOLS } from "@/core/agents/tools";
import { AppError } from "@/core/errors";
import { getActorOrNull, getDb } from "@/lib/server/context";
import { brl, Flash, flashFrom, PageTitle, Stamp, type SearchParams } from "@/components/ui";
import { contractAction } from "../../actions";

const APPROVAL: Record<string, string> = {
  always: "Toda mensagem passa por aprovação do escritório",
  first_contact: "Primeiro lembrete de cada cliente passa por aprovação",
  never: "Envio automático, sem aprovação",
};

export default async function ListingPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: SearchParams }) {
  const { slug } = await params;
  const flash = await flashFrom(searchParams);
  let data;
  try {
    data = await getListingBySlug(await getDb(), slug);
  } catch (e) {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  }
  const { listing, plans } = data;
  const spec = listing.spec;
  const actor = await getActorOrNull();
  const canContract = actor?.orgIsBuyer && actor.role !== "member";

  return (
    <div>
      <Flash {...flash} />
      <PageTitle kicker={`por ${listing.creator_name} · versão ${listing.version}`} title={listing.title}>
        {listing.summary}
      </PageTitle>
      {listing.is_fictitious && (
        <p className="mb-8 inline-block -rotate-1"><Stamp tone="red">Exemplo fictício — não é oferta comercial</Stamp></p>
      )}

      <div className="grid gap-10 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-2xl font-semibold">O que o agente cobra</h2>
            <table className="ledger">
              <thead>
                <tr><th>Documento</th><th>Tipo</th><th>Regimes</th><th>Obrigatório</th></tr>
              </thead>
              <tbody>
                {spec.checklist.map((c) => (
                  <tr key={c.key}>
                    <td className="font-medium">{c.label}</td>
                    <td>{DOC_TYPE_LABELS[c.docType]}</td>
                    <td className="text-xs uppercase text-muted">{c.appliesTo.join(" · ")}</td>
                    <td>{c.required ? "sim" : "não"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="card p-4">
              <p className="label">Calendário</p>
              <p>Do dia <span className="num">{spec.schedule.startDay}</span> ao dia <span className="num">{spec.schedule.deadlineDay}</span> de cada mês</p>
            </div>
            <div className="card p-4">
              <p className="label">Lembretes</p>
              <p>{spec.reminders.channel === "email" ? "E-mail" : "WhatsApp"}, até {spec.reminders.maxPerClient} por cliente, a cada {spec.reminders.intervalDays} dias, tom {spec.reminders.tone}</p>
            </div>
            <div className="card p-4 sm:col-span-2">
              <p className="label">Aprovação</p>
              <p>{APPROVAL[spec.approvals.sendMessages]}. O escritório pode tornar a regra mais rígida depois de contratar.</p>
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-2xl font-semibold">Ferramentas autorizadas</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {spec.tools.map((t) => (
                <li key={t} className="border-l-2 border-ledger pl-3 text-sm">
                  <span className="font-semibold">{TOOLS[t].label}</span>
                  <span className="block text-ink-soft">{TOOLS[t].description}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              O agente só pode usar estas ferramentas. Limites por execução: {spec.limits.maxStepsPerRun} passos, {spec.limits.runTimeoutSeconds}s, {brl(spec.limits.maxCostCentsPerRun)}.
            </p>
          </section>
        </div>

        <aside className="space-y-4">
          <h2 className="text-2xl font-semibold">Planos (modo teste)</h2>
          {plans.map((p) => (
            <form key={p.id} action={contractAction} className="card p-5">
              <input type="hidden" name="listingId" value={listing.id} />
              <input type="hidden" name="planCode" value={p.code} />
              <input type="hidden" name="slug" value={listing.slug} />
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-semibold">{p.name}</h3>
                <p><span className="num text-2xl font-semibold">{brl(p.monthly_price_cents)}</span><span className="text-sm text-muted">/mês</span></p>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                <li>Até {p.included_client_companies} empresas-cliente</li>
                <li>Orçamento de IA de até {brl(p.max_monthly_budget_cents)}/mês</li>
                <li>Até {p.max_concurrent_runs} execução(ões) simultânea(s)</li>
              </ul>
              <button disabled={!canContract} className="btn btn-primary mt-4 w-full justify-center disabled:opacity-40">
                Contratar em modo teste
              </button>
            </form>
          ))}
          {!canContract && (
            <p className="text-xs text-muted">
              {actor ? "Só sócios ou admins de um escritório comprador podem contratar." : "Entre como um escritório (persona fictícia) para contratar."}
            </p>
          )}
          <p className="text-xs text-muted">Preços são hipóteses em validação. Nenhuma cobrança real é feita.</p>
        </aside>
      </div>
    </div>
  );
}
