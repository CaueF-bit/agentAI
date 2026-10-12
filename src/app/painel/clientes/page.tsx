import { redirect } from "next/navigation";
import { listClients, listDocuments } from "@/core/clients/clients";
import { DOC_TYPE_LABELS, type DocType } from "@/core/agents/spec";
import { currentCompetence } from "@/core/ids";
import { getDb, requirePageActor } from "@/lib/server/context";
import { dt, Flash, flashFrom, PageTitle, Stamp, type SearchParams } from "@/components/ui";
import { addClientAction, addDocumentAction } from "../../actions";

export default async function ClientsPage({ searchParams }: { searchParams: SearchParams }) {
  const actor = await requirePageActor();
  if (!actor.orgIsBuyer) redirect("/criador");
  const db = await getDb();
  const comp = currentCompetence();
  const [clients, docs] = await Promise.all([listClients(db, actor), listDocuments(db, actor, comp)]);
  return (
    <div className="space-y-10">
      <div>
        <Flash {...(await flashFrom(searchParams))} />
        <PageTitle kicker={`Competência ${comp}`} title="Empresas-cliente e documentos">
          Dados privados do seu escritório. No MVP, o recebimento de documentos é simulado com texto. Leitura de PDF e imagem está fora do escopo.
        </PageTitle>
      </div>

      <table className="ledger">
        <thead><tr><th>Empresa</th><th>Regime</th><th>Contato</th><th>Documentos recebidos ({comp})</th></tr></thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td className="font-medium">{c.name}</td>
              <td className="uppercase">{c.tax_regime}</td>
              <td className="text-xs">{c.contact_email ?? "—"}<br />{c.contact_phone ?? ""}</td>
              <td className="space-y-1 text-xs">
                {docs.filter((d) => d.client_company_id === c.id).map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center gap-2">
                    <span className="num">{d.filename}</span>
                    {d.classified_type ? <Stamp tone="green">{DOC_TYPE_LABELS[d.classified_type as DocType] ?? d.classified_type}</Stamp> : <Stamp tone="gray">não classificado</Stamp>}
                    <span className="text-muted">{dt(d.received_at)}</span>
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="grid gap-6 md:grid-cols-2">
        <form action={addClientAction} className="card space-y-3 p-5">
          <h3 className="text-xl font-semibold">Nova empresa-cliente (fictícia)</h3>
          <input name="name" className="field" placeholder="Razão social" />
          <select name="taxRegime" className="field" defaultValue="simples">
            <option value="mei">MEI</option><option value="simples">Simples Nacional</option><option value="presumido">Lucro Presumido</option><option value="real">Lucro Real</option>
          </select>
          <input name="contactEmail" className="field" placeholder="contato@empresa.example" />
          <input name="contactPhone" className="field" placeholder="+55 11 90000-0000" />
          <button className="btn btn-primary">Cadastrar</button>
        </form>
        <form action={addDocumentAction} className="card space-y-3 p-5">
          <h3 className="text-xl font-semibold">Receber documento (simulado)</h3>
          <select name="clientCompanyId" className="field">
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input name="competence" className="field num" defaultValue={comp} />
          <input name="filename" className="field" placeholder="extrato_banco_mes.txt" />
          <textarea name="content" rows={3} className="field" placeholder="Texto extraído do documento (fictício)" />
          <button className="btn btn-ghost">Registrar recebimento</button>
          <p className="text-xs text-muted">O conteúdo é tratado como não confiável: só serve para classificar o tipo do documento.</p>
        </form>
      </section>
    </div>
  );
}
