import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getInstallation } from "@/core/installations/installations";
import { listPendingApprovals } from "@/core/approvals/approvals";
import { listMessages, listRuns, usageForInstallation } from "@/core/runtime/runs";
import { AppError } from "@/core/errors";
import { getKillSwitch } from "@/core/system/platform";
import { getDb, requirePageActor } from "@/lib/server/context";
import { brl, dt, Flash, flashFrom, Meter, PageTitle, Stamp, StatusStamp, type SearchParams } from "@/components/ui";
import {
  connectionAction,
  decideApprovalAction,
  pauseAction,
  runNowAction,
  simulatePaymentAction,
  updateLimitsAction,
  upgradeAction,
} from "../../../actions";

export default async function InstallationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const actor = await requirePageActor();
  const { id } = await params;
  const db = await getDb();
  let data;
  try {
    data = await getInstallation(db, actor, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  }
  const { installation: ins, subscription, connections, budget } = data;
  const [runs, approvals, messages, usage, kill] = await Promise.all([
    listRuns(db, actor, id),
    listPendingApprovals(db, actor, id),
    listMessages(db, actor, id),
    usageForInstallation(db, actor, id),
    getKillSwitch(db),
  ]);
  const isAdmin = actor.role !== "member";
  const hidden = <input type="hidden" name="installationId" value={ins.id} />;

  return (
    <div className="space-y-10">
      <div>
        <Flash {...(await flashFrom(searchParams))} />
        <PageTitle kicker={`Instalação · versão ${ins.version} · plano ${ins.plan_name}`} title={ins.title}>
          Configuração e histórico exclusivos do seu escritório. Credenciais e dados não são compartilhados com outras instalações.
        </PageTitle>
        <div className="flex flex-wrap items-center gap-3">
          <StatusStamp status={ins.status} />
          <span className="text-sm text-muted">assinatura</span>
          {subscription && <StatusStamp status={subscription.status} />}
          <Stamp tone="gray">modo teste</Stamp>
          {kill.enabled && <Stamp tone="red">interrompido pela plataforma</Stamp>}
          {ins.latest_version && ins.latest_version > ins.version && <Stamp tone="amber">v{ins.latest_version} disponível</Stamp>}
        </div>
      </div>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="card p-5 md:col-span-2">
          <p className="label">Orçamento de execução · {budget.period}</p>
          <Meter used={budget.spent_cents ?? 0} reserved={budget.reserved_cents ?? 0} limit={budget.limit_cents ?? 0} />
          <table className="ledger mt-4">
            <thead><tr><th>Consumo do mês</th><th>Chamadas</th><th className="text-right">Custo</th></tr></thead>
            <tbody>
              {usage.map((u) => (
                <tr key={u.kind}>
                  <td>{u.kind === "model" ? "Modelo de IA (custo simulado na demo)" : "Canal de mensagens"}</td>
                  <td className="num">{u.calls}</td>
                  <td className="num text-right">{brl(u.cost_cents)}</td>
                </tr>
              ))}
              {usage.length === 0 && <tr><td colSpan={3} className="text-muted">Sem consumo neste mês.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card flex flex-col gap-3 p-5">
          <p className="label">Ações</p>
          <form action={runNowAction}>
            {hidden}
            <input type="hidden" name="idempotencyKey" value={`manual:${randomUUID()}`} />
            <button className="btn btn-primary w-full justify-center" disabled={ins.status !== "active" || subscription?.status !== "active"}>
              Executar agora
            </button>
          </form>
          {subscription?.status === "pending" && isAdmin && (
            <form action={simulatePaymentAction}>
              {hidden}
              <button className="btn btn-ghost w-full justify-center">Simular pagamento aprovado (teste)</button>
            </form>
          )}
          {isAdmin && (
            <form action={pauseAction}>
              {hidden}
              <input type="hidden" name="pause" value={ins.status === "active" ? "1" : "0"} />
              <button className={`btn w-full justify-center ${ins.status === "active" ? "btn-danger" : "btn-primary"}`}>
                {ins.status === "active" ? "Pausar agente" : "Retomar agente"}
              </button>
            </form>
          )}
          {isAdmin && ins.latest_version && ins.latest_version > ins.version && (
            <form action={upgradeAction}>
              {hidden}
              <button className="btn btn-ghost w-full justify-center">Atualizar para v{ins.latest_version}</button>
            </form>
          )}
          <p className="text-xs text-muted">
            Pausar impede novas execuções; uma execução em andamento para antes do próximo passo. Envios já iniciados terminam a tentativa atual.
          </p>
        </div>
      </section>

      <section id="aprovacoes">
        <h2 className="mb-3 text-3xl font-semibold">Aprovações pendentes</h2>
        {approvals.length === 0 && <p className="text-muted">Nada aguardando aprovação.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {approvals.map((a) => (
            <div key={a.id} className="card p-5">
              <p className="label">Lembrete {a.params.reminderNumber} · {a.params.channel} · {a.params.to}</p>
              <p className="font-semibold">{a.params.clientName}</p>
              <pre className="mt-2 whitespace-pre-wrap border-l-2 border-rule pl-3 font-[family-name:var(--font-sans)] text-sm">{a.params.body}</pre>
              {isAdmin ? (
                <div className="mt-4 flex gap-2">
                  {(["approve", "reject"] as const).map((d) => (
                    <form key={d} action={decideApprovalAction}>
                      {hidden}
                      <input type="hidden" name="approvalId" value={a.id} />
                      <input type="hidden" name="paramsHash" value={a.params_hash} />
                      <input type="hidden" name="decision" value={d} />
                      <button className={`btn ${d === "approve" ? "btn-primary" : "btn-ghost"}`}>{d === "approve" ? "Aprovar e enviar" : "Rejeitar"}</button>
                    </form>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted">Só sócios ou admins aprovam.</p>
              )}
              <p className="num mt-3 text-[10px] text-muted">vinculada a {a.params_hash.slice(0, 16)}…</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-3xl font-semibold">Execuções</h2>
        <table className="ledger">
          <thead><tr><th>Início</th><th>Competência</th><th>Status</th><th>Passos</th><th>Custo</th><th>Resumo</th><th /></tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td className="num text-xs">{dt(r.created_at)}</td>
                <td className="num">{r.competence}</td>
                <td><StatusStamp status={r.status} />{r.error_code && <span className="ml-2 text-xs text-muted">{r.error_code}</span>}</td>
                <td className="num">{r.steps_used}</td>
                <td className="num">{brl(r.cost_cents)}</td>
                <td className="text-xs">{r.summary ? `${r.summary.totals.complete}/${r.summary.totals.clients} completos` : "—"}</td>
                <td><Link className="text-ledger underline" href={`/painel/execucoes/${r.id}`}>detalhes</Link></td>
              </tr>
            ))}
            {runs.length === 0 && <tr><td colSpan={7} className="text-muted">Nenhuma execução ainda.</td></tr>}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-3 text-3xl font-semibold">Mensagens <span className="text-base font-normal text-muted">(canal simulado)</span></h2>
        <table className="ledger">
          <thead><tr><th>Cliente</th><th>Canal</th><th>Status</th><th>Tentativas</th><th>Enviada</th></tr></thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id}>
                <td>{m.client_name}</td>
                <td>{m.channel}</td>
                <td><StatusStamp status={m.status} />{m.last_error && <span className="ml-2 text-xs text-muted">{m.last_error}</span>}</td>
                <td className="num">{m.attempts}</td>
                <td className="num text-xs">{dt(m.sent_at)}</td>
              </tr>
            ))}
            {messages.length === 0 && <tr><td colSpan={5} className="text-muted">Nenhuma mensagem.</td></tr>}
          </tbody>
        </table>
      </section>

      {isAdmin && (
        <section className="grid gap-6 md:grid-cols-2">
          <form action={updateLimitsAction} className="card space-y-4 p-5">
            {hidden}
            <h3 className="text-xl font-semibold">Limites e aprovação</h3>
            <label>
              <span className="label">Orçamento mensal (R$) · teto do plano {brl(ins.plan_max_budget)}</span>
              <input name="budgetReais" className="field num" defaultValue={(ins.monthly_budget_cents / 100).toFixed(2)} />
            </label>
            <label>
              <span className="label">Execuções simultâneas · teto {ins.plan_max_concurrency}</span>
              <input name="maxConcurrentRuns" type="number" min={1} className="field num" defaultValue={ins.max_concurrent_runs} />
            </label>
            <label>
              <span className="label">Aprovação de mensagens</span>
              <select name="approvalPolicy" className="field" defaultValue={ins.approval_policy}>
                <option value="always">Sempre aprovar antes de enviar</option>
                <option value="first_contact">Aprovar só o primeiro contato</option>
                <option value="never">Enviar sem aprovação</option>
              </select>
            </label>
            <button className="btn btn-primary">Salvar limites</button>
          </form>

          <form action={connectionAction} className="card space-y-4 p-5">
            {hidden}
            <h3 className="text-xl font-semibold">Conexões desta instalação</h3>
            <ul className="space-y-1 text-sm">
              {connections.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span>{c.label} <span className="text-muted">({c.kind})</span></span>
                  <span className="num">{c.secret_last4}</span>
                </li>
              ))}
              {connections.length === 0 && <li className="text-muted">Nenhuma conexão.</li>}
            </ul>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="label">Canal</span>
                <select name="kind" className="field"><option value="email">E-mail</option><option value="whatsapp">WhatsApp</option></select>
              </label>
              <label>
                <span className="label">Nome</span>
                <input name="label" className="field" placeholder="Ex.: SMTP do escritório" />
              </label>
            </div>
            <label>
              <span className="label">Credencial (use um valor fictício na demo)</span>
              <input name="secret" type="password" autoComplete="off" className="field" />
            </label>
            <button className="btn btn-ghost">Salvar conexão</button>
            <p className="text-xs text-muted">A credencial é cifrada com chave fora do banco e nunca é exibida de volta. No MVP o envio é simulado.</p>
          </form>
        </section>
      )}
    </div>
  );
}
