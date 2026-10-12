# Registro de decisões

Formato: data, decisão, motivo, alternativas. Inclui toda correção de expectativa de teste (CLAUDE.md §2), com a justificativa.

## D-001 · 2026-10-11 · Regras do projeto centralizadas em CLAUDE.md

- **Decisão:** `CLAUDE.md` é a fonte única das regras; `AGENTS.md` aponta para ele; `docs/` guarda os registros vivos.
- **Motivo:** evitar duplicação e divergência.

## D-002 · 2026-10-11 · Nicho provisório: organizações contábeis; fluxo: Fechamento Mensal

- **Decisão:** adotar como **hipótese** para a documentação e a demonstração.
- **Motivo:** maior pontuação na matriz (3,70) — [niche-selection.md](research/niche-selection.md).
- **Alternativas:** imobiliárias (3,47), seguros, odontologia, oficinas, advocacia.
- **Reversível:** sim. Critérios de abandono no mesmo documento.

## D-003 · 2026-10-11 · Monólito modular Next.js + núcleo de domínio independente

- **Motivo:** o MVP não precisa de serviços separados; um só deploy; o núcleo pode ser testado sem HTTP.
- **Alternativas:** backend separado (FastAPI/Nest) — descartado por custo de operação; vários agentes cooperando — sem necessidade demonstrada.

## D-004 · 2026-10-11 · PGlite (Postgres embutido) para demo e testes

- **Motivo:** o ambiente não tem Docker nem banco; o PGlite roda Postgres real com RLS, então as políticas podem ser testadas com o papel da aplicação.
- **Limitação:** uma conexão por vez; a concorrência real precisa de teste em Postgres gerenciado (pendente).
- **Alternativa:** SQLite (sem RLS) — descartado.

## D-005 · 2026-10-11 · IA simulada por padrão; adaptador Anthropic opcional, não executado

- **Motivo:** não há credencial nem orçamento autorizados; as regras proíbem gastos sem autorização.
- **Consequência:** a IA real **não está validada** ([evaluations.md](technical/evaluations.md)).
- **Modelo padrão do adaptador:** `claude-opus-5-5`. Modelos menores só depois de avaliação comparativa.

## D-006 · 2026-10-11 · Login de demonstração sem senha, só com DEMO_MODE=true

- **Motivo:** permite testar papéis e isolamento sem criar autenticação própria (proibido inventar mecanismo de senha).
- **Pendente:** escolher um provedor consolidado (Clerk, Auth.js ou Supabase Auth) antes de qualquer cliente real.

## D-007 · 2026-10-11 · Orquestração determinística; o modelo só classifica e redige

- **Motivo:** permissões, limites e decisões ficam em código testável; reduz o risco de injeção de instruções.
- **Alternativa:** loop agêntico com o modelo escolhendo ferramentas — adiado até haver necessidade e avaliações.

## D-008 · 2026-10-11 · Sem fallback automático de modelo no adaptador

- **Motivo:** manter um único caminho de saída estruturada; recusas são improváveis no domínio. Reavaliar com dados reais.

## D-009 · 2026-10-11 · Regra de pausa

- **Decisão:** pausar recusa novas execuções e interrompe a execução em andamento **antes da próxima ferramenta**. Um envio já iniciado conclui as tentativas daquela mensagem. Aprovações pendentes não executam enquanto estiver pausado.
- **Motivo:** não deixar mensagens em estado incerto. Detalhes em [agent-runtime.md](technical/agent-runtime.md).

## D-010 · 2026-10-11 · Política de aprovação definida pelo comprador na instalação

- **Decisão:** a instalação começa com a política do criador; owner ou admin do escritório pode alterá-la. O agente nunca altera.

## D-011 · 2026-10-11 · Cobrar só o comprador no lançamento; repasse de 70% a criadores parceiros

- **Motivo:** reduzir o atrito do lado da oferta enquanto não há demanda do marketplace ([pricing.md](business/pricing.md)).

## Correções de expectativa de teste

| Data | Teste | Mudança | Por quê |
|---|---|---|---|
| 2026-10-11 | RUN-09 | Contagem esperada de erros de classificação: 7 → 6 | Erro de contagem no teste: os dados fictícios têm 6 documentos (3+2+0+1). O requisito não mudou |
| 2026-10-11 | BIL-02 | Orçamento disponível reduzido a R$ 0,40 (gasto prévio de R$ 0,60) | O teste original não exercitava o requisito: o orçamento de R$ 1,00 nunca se esgotava com o custo simulado. A versão nova força a disputa por orçamento |
| 2026-10-11 | BIL-08 | Adulteração da assinatura passou a trocar o primeiro dígito por um valor sempre diferente | Teste intermitente: trocava sempre por "0", o que não alterava nada em 1/16 das execuções. Falhou 1 vez em 4 rodadas completas; depois da correção, 20/20. Verificação não foi afrouxada |
| 2026-10-11 | BIL-07 | O teste passou a exigir que o papel da aplicação **não** altere assinaturas | A primeira versão aceitava a alteração; isso revelou uma falha real de defesa em profundidade, corrigida no esquema (sem UPDATE em `subscriptions` + gatilhos de teto) |

## Pendentes de decisão

- Nome definitivo da empresa e marca ("AgentAI" é só o nome de trabalho).
- Licença do código (nenhuma licença aberta escolhida; o repositório não tem LICENSE, ou seja, todos os direitos reservados por padrão).
- Provedor de autenticação, banco gerenciado, provedor de pagamentos (com split) e de e-mail.
- Infraestrutura de fila e worker para execuções longas.
