import { notFound, redirect } from "next/navigation";
import { getDefinition } from "@/core/agents/definitions";
import { AppError } from "@/core/errors";
import { getDb, requirePageActor } from "@/lib/server/context";
import { dt, Flash, flashFrom, PageTitle, Stamp, type SearchParams } from "@/components/ui";
import { SpecEditor } from "@/components/spec-editor";
import { SandboxPanel } from "@/components/sandbox-panel";
import { publishAction, saveDraftAction } from "../../../actions";

export default async function DefinitionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const actor = await requirePageActor();
  if (!actor.orgIsCreator) redirect("/painel");
  const { id } = await params;
  let data;
  try {
    data = await getDefinition(await getDb(), actor, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  }
  const { definition, versions } = data;
  return (
    <div className="space-y-10">
      <div>
        <Flash {...(await flashFrom(searchParams))} />
        <PageTitle kicker="Rascunho" title={definition.name}>
          Edite, teste no sandbox e publique. Quem já contratou continua na versão que contratou até decidir atualizar.
        </PageTitle>
      </div>

      <section className="grid gap-6 md:grid-cols-[1fr_280px]">
        <SandboxPanel definitionId={definition.id} />
        <div className="card p-5">
          <h3 className="text-xl font-semibold">Versões</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between">
                <Stamp tone="green">v{v.version}</Stamp>
                <span className="num text-xs text-muted">{dt(v.published_at)} · {v.spec_hash.slice(0, 8)}</span>
              </li>
            ))}
            {versions.length === 0 && <li className="text-muted">Nenhuma versão publicada.</li>}
          </ul>
          {actor.role !== "member" && (
            <form action={publishAction} className="mt-4">
              <input type="hidden" name="definitionId" value={definition.id} />
              <button className="btn btn-primary w-full justify-center">Publicar rascunho atual</button>
            </form>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-3xl font-semibold">Especificação</h2>
        <SpecEditor initial={definition.draft_spec} action={saveDraftAction} hidden={{ definitionId: definition.id }} submitLabel="Salvar rascunho" />
      </section>
    </div>
  );
}
