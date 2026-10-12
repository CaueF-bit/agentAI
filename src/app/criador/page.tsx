import Link from "next/link";
import { redirect } from "next/navigation";
import { listDefinitions } from "@/core/agents/definitions";
import { getDb, requirePageActor } from "@/lib/server/context";
import { dt, PageTitle, Stamp } from "@/components/ui";

export default async function CreatorHome() {
  const actor = await requirePageActor();
  if (!actor.orgIsCreator) redirect("/painel");
  const defs = await listDefinitions(await getDb(), actor);
  return (
    <div>
      <PageTitle kicker={actor.orgName} title="Seus agentes">
        Rascunhos são privados da sua organização. Cada publicação gera uma versão imutável.
      </PageTitle>
      <div className="mb-6">
        <Link href="/criador/novo" className="btn btn-primary">Novo agente por descrição</Link>
      </div>
      <table className="ledger">
        <thead>
          <tr><th>Agente</th><th>Última versão</th><th>Rascunho atualizado</th><th /></tr>
        </thead>
        <tbody>
          {defs.map((d) => (
            <tr key={d.id}>
              <td className="font-medium">{d.name}</td>
              <td>{d.latest_version ? <Stamp tone="green">v{d.latest_version}</Stamp> : <Stamp tone="gray">não publicado</Stamp>}</td>
              <td className="num text-xs">{dt(d.draft_updated_at)}</td>
              <td className="text-right"><Link className="font-semibold text-ledger underline" href={`/criador/agentes/${d.id}`}>abrir</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
