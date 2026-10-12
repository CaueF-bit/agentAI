import { redirect } from "next/navigation";
import { requirePageActor } from "@/lib/server/context";
import { Flash, flashFrom, PageTitle, type SearchParams } from "@/components/ui";
import { Builder } from "@/components/builder";

export default async function NewAgentPage({ searchParams }: { searchParams: SearchParams }) {
  const actor = await requirePageActor();
  if (!actor.orgIsCreator) redirect("/painel");
  return (
    <div>
      <Flash {...(await flashFrom(searchParams))} />
      <PageTitle kicker="IA construtora" title="Descreva o agente">
        A IA propõe uma especificação com componentes do nicho e aponta o que faltou. Tudo que ela gera é validado pelo servidor antes de ser salvo.
      </PageTitle>
      <Builder />
    </div>
  );
}
