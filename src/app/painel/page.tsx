import Link from "next/link";
import { redirect } from "next/navigation";
import { listInstallations } from "@/core/installations/installations";
import { listPendingApprovals } from "@/core/approvals/approvals";
import { getDb, requirePageActor } from "@/lib/server/context";
import { brl, Flash, flashFrom, PageTitle, Stamp, StatusStamp, type SearchParams } from "@/components/ui";

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const actor = await requirePageActor();
  if (!actor.orgIsBuyer) redirect("/criador");
  const db = await getDb();
  const [installations, approvals] = await Promise.all([listInstallations(db, actor), listPendingApprovals(db, actor)]);
  return (
    <div>
      <Flash {...(await flashFrom(searchParams))} />
      <PageTitle kicker={actor.orgName} title="Painel do escritório">
        Agentes contratados, aprovações pendentes e consumo do mês.
      </PageTitle>

      {approvals.length > 0 && (
        <div className="rise mb-8 flex flex-wrap items-center justify-between gap-4 border-l-4 border-amber bg-amber-wash px-5 py-4">
          <p>
            <strong className="num">{approvals.length}</strong> mensagem(ns) aguardando aprovação.
          </p>
          <Link className="font-semibold underline" href={`/painel/instalacoes/${approvals[0].installation_id}#aprovacoes`}>Revisar</Link>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {installations.map((i, k) => (
          <Link key={i.id} href={`/painel/instalacoes/${i.id}`} className={`rise rise-${Math.min(4, k + 1)} card block p-6 hover:-translate-y-0.5 transition`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl font-semibold">{i.title}</h2>
              <StatusStamp status={i.status} />
            </div>
            <p className="mt-2 text-sm text-muted">
              versão {i.version} · plano {i.plan_name} · orçamento {brl(i.monthly_budget_cents)}/mês
            </p>
            <div className="mt-4 flex gap-2">
              <span className="text-xs text-muted">assinatura:</span> <StatusStamp status={i.subscription_status} />
              {i.subscription_status === "pending" && <Stamp tone="amber">simule o pagamento</Stamp>}
            </div>
          </Link>
        ))}
      </div>
      {installations.length === 0 && (
        <p className="text-muted">
          Nenhum agente contratado. <Link className="underline" href="/catalogo">Ver catálogo</Link>.
        </p>
      )}
    </div>
  );
}
