import { listDemoPersonas } from "@/core/auth/session";
import { getConfig } from "@/core/config";
import { getDb } from "@/lib/server/context";
import { PageTitle, Stamp, type SearchParams } from "@/components/ui";
import { loginAction } from "../actions";

const MOTIVOS: Record<string, string> = {
  "sem-acesso": "Seu acesso a esta organização foi revogado ou não existe.",
  operador: "Área restrita ao operador da plataforma.",
};

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const motivo = typeof sp.motivo === "string" ? MOTIVOS[sp.motivo] : undefined;
  if (!getConfig().demoMode) {
    return <PageTitle title="Login indisponível">O login de demonstração está desativado. A autenticação de produção ainda não foi implementada.</PageTitle>;
  }
  const personas = await listDemoPersonas(await getDb());
  return (
    <div>
      <PageTitle kicker="Demonstração" title="Escolha uma persona fictícia">
        Não há senha: este login existe só no modo de demonstração. Em produção ele será trocado por autenticação de um provedor consolidado.
      </PageTitle>
      {motivo && <p className="mb-6 rounded border border-stamp bg-stamp-wash px-4 py-3 text-sm text-stamp">{motivo}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {personas.map((p, i) => (
          <form key={p.id} action={loginAction} className={`rise rise-${Math.min(4, i + 1)} card flex items-center justify-between gap-4 p-5`}>
            <input type="hidden" name="userId" value={p.id} />
            <div>
              <p className="font-[family-name:var(--font-display)] text-xl">{p.name}</p>
              <p className="text-sm text-muted">{p.is_platform_admin ? "Operador da plataforma" : p.orgs}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {p.is_platform_admin && <Stamp tone="red">operador</Stamp>}
              <button className="btn btn-primary">Entrar</button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
