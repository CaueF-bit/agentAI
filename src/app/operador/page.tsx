import { listAllListingsForOperator } from "@/core/catalog/catalog";
import { getKillSwitch, listAudit, operatorOverview } from "@/core/system/platform";
import { getDb, requirePageOperator } from "@/lib/server/context";
import { brl, dt, Flash, flashFrom, PageTitle, Stamp, StatusStamp, type SearchParams } from "@/components/ui";
import { killSwitchAction, listingStatusAction } from "../actions";

export default async function OperatorPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePageOperator();
  const db = await getDb();
  const [kill, overview, listings, audit] = await Promise.all([getKillSwitch(db), operatorOverview(db), listAllListingsForOperator(db), listAudit(db, 40)]);
  return (
    <div className="space-y-10">
      <div>
        <Flash {...(await flashFrom(searchParams))} />
        <PageTitle kicker="Operador da plataforma" title="Console de operação">
          Visão agregada, sem acesso a documentos, mensagens ou credenciais dos escritórios.
        </PageTitle>
      </div>

      <section className={`card p-6 ${kill.enabled ? "border-stamp" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Interruptor global de execuções</h2>
            <p className="text-sm text-muted">
              Ligado: nenhuma execução começa, as em andamento param no próximo passo e aprovações não são executadas.
            </p>
          </div>
          {kill.enabled ? <Stamp tone="red">ligado: {kill.reason}</Stamp> : <Stamp tone="green">desligado</Stamp>}
        </div>
        <form action={killSwitchAction} className="mt-4 flex flex-wrap gap-3">
          <input type="hidden" name="enabled" value={kill.enabled ? "0" : "1"} />
          <input name="reason" className="field !w-80" placeholder="Motivo (vai para a auditoria)" />
          <button className={`btn ${kill.enabled ? "btn-primary" : "btn-danger"}`}>{kill.enabled ? "Desligar interruptor" : "Interromper todas as execuções"}</button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-3xl font-semibold">Escritórios (últimos 30 dias)</h2>
        <table className="ledger">
          <thead><tr><th>Organização</th><th>Instalações</th><th>Execuções</th><th>Falhas / sem orçamento</th><th className="text-right">Consumo</th></tr></thead>
          <tbody>
            {overview.map((o) => (
              <tr key={o.org}>
                <td>{o.org}</td>
                <td className="num">{o.installations}</td>
                <td className="num">{o.runs_month}</td>
                <td className={`num ${o.failed_month ? "text-stamp" : ""}`}>{o.failed_month}</td>
                <td className="num text-right">{brl(o.cost_month_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-3 text-3xl font-semibold">Catálogo</h2>
        <table className="ledger">
          <thead><tr><th>Anúncio</th><th>Criador</th><th>Instalações</th><th>Status</th><th /></tr></thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.id}>
                <td>{l.title}</td>
                <td className="text-sm">{l.creator_name}</td>
                <td className="num">{l.installs}</td>
                <td><StatusStamp status={l.status} /></td>
                <td className="text-right">
                  <form action={listingStatusAction}>
                    <input type="hidden" name="listingId" value={l.id} />
                    <input type="hidden" name="status" value={l.status === "listed" ? "unlisted" : "listed"} />
                    <button className="text-sm font-semibold underline">{l.status === "listed" ? "retirar" : "relistar"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted">Retirar impede novas contratações; quem já contratou continua operando.</p>
      </section>

      <section>
        <h2 className="mb-3 text-3xl font-semibold">Auditoria</h2>
        <table className="ledger">
          <thead><tr><th>Quando</th><th>Organização</th><th>Quem</th><th>Ação</th><th>Alvo</th></tr></thead>
          <tbody>
            {audit.map((a) => (
              <tr key={a.id}>
                <td className="num text-xs">{dt(a.created_at)}</td>
                <td className="text-xs">{a.org ?? "plataforma"}</td>
                <td className="text-xs">{a.actor ?? "sistema"}</td>
                <td className="num text-xs">{a.action}</td>
                <td className="num text-xs text-muted">{a.target ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
