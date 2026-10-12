import Link from "next/link";
import { Stamp } from "@/components/ui";

const STEPS = [
  ["01", "Descreva", "Em português: quais documentos cobrar, até que dia, por qual canal e com que aprovação."],
  ["02", "Revise a especificação", "A IA monta um agente com componentes do nicho. Você ajusta e testa com dados fictícios."],
  ["03", "Opere com limites", "Orçamento que não estoura, aprovação humana antes do envio e pausa imediata."],
  ["04", "Acompanhe cliente a cliente", "Pendências, mensagens, falhas e consumo de cada competência em um painel."],
];

const GUARANTEES = [
  ["Nenhum lembrete duplicado", "Cada mensagem tem chave única. Uma falha é repetida no máximo 3 vezes, e se o resultado ficou incerto, o sistema consulta antes de reenviar."],
  ["Você aprova o que sai", "A aprovação vale para o texto e o destinatário exatos que você viu."],
  ["Gasto previsível", "Limite mensal por agente, respeitado mesmo com execuções simultâneas."],
  ["Seus dados, só seus", "Isolamento por escritório no servidor e no banco. Credenciais cifradas por instalação."],
];

export default function Home() {
  return (
    <div className="space-y-20">
      <section className="grid gap-10 md:grid-cols-[1.25fr_1fr] md:items-end">
        <div>
          <p className="rise rise-1 mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-ledger">Para escritórios de contabilidade</p>
          <h1 className="rise rise-2 text-5xl font-semibold leading-[1.02] md:text-7xl">
            Feche o mês de todos os clientes <em className="text-ledger">no prazo</em>.
          </h1>
          <p className="rise rise-3 mt-6 max-w-xl text-lg text-ink-soft">
            Agentes de IA que cobram, recebem, conferem e organizam os documentos do fechamento, sempre com sua aprovação e dentro de limites que você define.
          </p>
          <div className="rise rise-4 mt-8 flex flex-wrap gap-3">
            <Link href="/catalogo" className="btn btn-primary">Ver agentes do catálogo</Link>
            <Link href="/login" className="btn btn-ghost">Entrar na demonstração</Link>
          </div>
        </div>

        <aside className="rise rise-3 card ledger-rules relative overflow-hidden p-6">
          <div className="absolute right-4 top-4 rotate-6"><Stamp tone="red">Exemplo fictício</Stamp></div>
          <p className="label">Competência 10/2026</p>
          <p className="font-[family-name:var(--font-display)] text-2xl">Contabilidade Horizonte</p>
          <table className="ledger mt-4">
            <tbody>
              {[
                ["Padaria Pão Dourado", "completo", "text-ledger"],
                ["Studio Forma Pilates", "2 pendências · lembrete aguardando aprovação", "text-amber"],
                ["Mercadinho Bom Preço", "3 pendências · lembrete aguardando aprovação", "text-amber"],
                ["João Reparos MEI", "completo", "text-ledger"],
              ].map(([n, s, c]) => (
                <tr key={n}>
                  <td className="font-medium">{n}</td>
                  <td className={`text-right text-xs ${c}`}>{s}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-muted">Ilustração com dados fictícios. Resultados reais dependem de piloto.</p>
        </aside>
      </section>

      <section>
        <h2 className="mb-6 text-3xl font-semibold">Como funciona</h2>
        <ol className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule md:grid-cols-4">
          {STEPS.map(([n, t, d]) => (
            <li key={n} className="bg-card p-5">
              <span className="num text-sm text-stamp">{n}</span>
              <h3 className="mt-2 text-xl font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-ink-soft">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-8 md:grid-cols-[1fr_2fr]">
        <div>
          <h2 className="text-3xl font-semibold">Controles que não dependem da IA</h2>
          <p className="mt-3 text-ink-soft">
            O modelo só classifica documentos e redige textos. Quem decide o que pode ser feito, até qual limite, é código determinístico e testado.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {GUARANTEES.map(([t, d]) => (
            <div key={t} className="border-l-2 border-ledger pl-4">
              <h3 className="text-lg font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-ink-soft">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-6 p-8">
        <div>
          <h2 className="text-2xl font-semibold">Especialista em rotinas contábeis?</h2>
          <p className="mt-1 text-ink-soft">Descreva sua rotina, publique um agente e ofereça aos escritórios que você já atende.</p>
        </div>
        <Link href="/login" className="btn btn-ghost">Entrar como criador (demo)</Link>
      </section>
    </div>
  );
}
