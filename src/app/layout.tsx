import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { currentSession } from "@/lib/server/context";
import { getConfig } from "@/core/config";
import { logoutAction, switchOrgAction } from "./actions";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz", "SOFT"] });
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "AgentAI — Agentes de fechamento para escritórios contábeis (demonstração)",
  description: "Versão de demonstração com dados fictícios e integrações simuladas.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();
  const cfg = getConfig();
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${plex.variable} ${plexMono.variable}`}>
      <body className="min-h-screen antialiased">
        <div className="hatch text-[#fff6ef]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 text-xs font-semibold">
            <span className="stamp border-[#fff6ef]">Demonstração</span>
            <span>
              Versão incompleta · dados fictícios · IA {cfg.aiProvider === "mock" ? "simulada" : "real (Anthropic)"} · pagamentos e mensagens simulados
            </span>
          </div>
        </div>

        <header className="border-b border-rule bg-paper/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-6 px-4 py-4">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-display)] text-2xl font-semibold italic text-ledger">AgentAI</span>
              <span className="hidden text-xs uppercase tracking-[0.2em] text-muted sm:inline">Fechamento contábil</span>
            </Link>
            <nav className="flex flex-1 flex-wrap gap-4 text-sm font-medium text-ink-soft">
              <Link href="/catalogo" className="hover:text-ledger">Catálogo</Link>
              {session?.memberships.some((m) => m.is_creator) && <Link href="/criador" className="hover:text-ledger">Criador</Link>}
              {session?.memberships.some((m) => m.is_buyer) && (
                <>
                  <Link href="/painel" className="hover:text-ledger">Painel</Link>
                  <Link href="/painel/clientes" className="hover:text-ledger">Clientes</Link>
                  <Link href="/painel/equipe" className="hover:text-ledger">Equipe</Link>
                </>
              )}
              {session?.isPlatformAdmin && <Link href="/operador" className="hover:text-stamp">Operador</Link>}
            </nav>
            {session ? (
              <div className="flex items-center gap-3 text-sm">
                {session.memberships.length > 1 ? (
                  <form action={switchOrgAction} className="flex items-center gap-2">
                    <select name="orgId" defaultValue={session.activeOrgId ?? ""} className="field !w-auto !py-1 text-xs">
                      {session.memberships.map((m) => (
                        <option key={m.org_id} value={m.org_id}>{m.org_name}</option>
                      ))}
                    </select>
                    <button className="text-xs underline">trocar</button>
                  </form>
                ) : (
                  <span className="text-xs text-muted">{session.memberships[0]?.org_name ?? "Plataforma"}</span>
                )}
                <span className="hidden font-medium md:inline">{session.userName}</span>
                <form action={logoutAction}>
                  <button className="btn btn-ghost !px-3 !py-1 text-xs">Sair</button>
                </form>
              </div>
            ) : (
              <Link href="/login" className="btn btn-primary !py-1.5">Entrar na demonstração</Link>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>

        <footer className="border-t border-rule">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted">
            Protótipo para validação. Nada aqui é oferta comercial, nem comprova resultado. Exemplos, empresas e pessoas são fictícios.
          </div>
        </footer>
      </body>
    </html>
  );
}
