import Link from "next/link";
import { listCatalog } from "@/core/catalog/catalog";
import { getDb } from "@/lib/server/context";
import { brl, PageTitle, Stamp } from "@/components/ui";

export default async function CatalogPage() {
  const listings = await listCatalog(await getDb());
  return (
    <div>
      <PageTitle kicker="Catálogo curado" title="Agentes para o fechamento mensal">
        Agentes revisados pela plataforma. Nesta demonstração, todos são exemplos fictícios criados por organizações fictícias.
      </PageTitle>
      <div className="grid gap-5 md:grid-cols-2">
        {listings.map((l, i) => (
          <Link key={l.id} href={`/catalogo/${l.slug}`} className={`rise rise-${Math.min(4, i + 1)} card group block p-6 transition hover:-translate-y-0.5`}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-semibold group-hover:text-ledger">{l.title}</h2>
              {l.is_fictitious && <Stamp tone="red">fictício</Stamp>}
            </div>
            <p className="mt-2 text-sm text-ink-soft">{l.summary}</p>
            <div className="mt-5 flex items-end justify-between border-t border-rule pt-4 text-sm">
              <span className="text-muted">
                por {l.creator_name} · v{l.version}
              </span>
              <span>
                a partir de <span className="num font-semibold">{brl(l.min_price_cents)}</span>
                <span className="text-muted">/mês</span>
              </span>
            </div>
          </Link>
        ))}
        {listings.length === 0 && <p className="text-muted">Nenhum agente listado no momento.</p>}
      </div>
    </div>
  );
}
