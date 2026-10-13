# Progresso

Registro para continuar o trabalho entre sessões. Atualizar ao fim de cada etapa.

## Ambiente (inspecionado em 2026-10-11)

- Node.js 24.15, npm 11.12, git 2.54. Sem Python, Docker, pnpm, `gh` ou CLI da Vercel.
- Internet disponível para pesquisa.
- **Nenhuma** credencial autorizada de IA, banco, pagamentos ou Vercel. Por isso IA, pagamentos e mensagens estão em modo simulado.

## Etapas

| # | Etapa | Estado |
|---|---|---|
| 0 | Inspeção do repositório e do ambiente | concluída |
| 1 | Pesquisa de mercado | concluída — `docs/research/*` |
| 2 | Seleção de nicho e fluxo | concluída — contábil / Fechamento Mensal (**hipótese**) |
| 3 | Negócio + calculadora | concluída — `docs/business/*`, `finance/` |
| 4 | Produto | concluída — `docs/vision.md`, `docs/product/*` |
| 5 | Técnico | concluída — `docs/technical/*` |
| 6 | Implementação da fatia funcional | concluída — `src/*` (modo demonstração) |
| 7 | Testes e verificação | concluída — 68/68; `npm run check` com saída 0; interface verificada manualmente no navegador |
| 8 | Operação, validação, roadmap, README | concluída — `docs/operations/*`, `docs/validation/*`, `docs/roadmap.md`, `README.md` |

## Últimas verificações (2026-10-11)

- `npm run check`: lint ok, tipos ok, 68/68 testes, segredos ok, build ok.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades.
- Navegador (dev local): login de demonstração, execução (19 passos, 2 aprovações pedidas, documento malicioso classificado como "outro"), aprovação com envio único, construtor → rascunho → sandbox. Nenhum erro nos logs do servidor.

## Vercel (2026-10-13)

- Projeto criado pelo responsável e importado de `CaueF-bit/agentAI`; Neon conectado ao ambiente Preview; variáveis definidas só em Preview.
- Deploy automático da `main` desligado (`vercel.json`); prévias publicadas a partir da branch `preview`.
- Verificado: a URL do deploy redireciona para o login da Vercel (Vercel Authentication ativa).
- O deploy de produção criado na importação não tem banco configurado e não deve ser usado.
- **Fase 0b concluída (2026-10-13):** prévia `eba80be` com `/api/health` `ok: true` (Neon) e roteiro Bruno executa → Ana aprova testado pelo responsável. Variáveis na Preview: `DEMO_MODE`, `DATABASE_URL` (Neon) e `ANTHROPIC_API_KEY` (guardada, sem uso enquanto `AI_PROVIDER` não for `anthropic`).

## Bloqueios (exigem decisão ou autorização do responsável)

- Commit e push deste trabalho para o GitHub: **aguardando autorização**.
- Proteção de branch no GitHub e projeto na Vercel: exigem acesso de administrador.
- Avaliação real da IA: exige credencial e orçamento autorizados.
- Análise jurídica e de LGPD antes de qualquer cliente real.

## Método e lições (2026-10-13)

- Adotado o método "parte arriscada primeiro" e fases com "pronto quando" (CLAUDE.md §13; [roadmap](roadmap.md)).
- Lições de erros reais registradas em CLAUDE.md §14.
- Escritos: o que o app nunca pode fazer ([vision.md](vision.md)), por que um escritório cancelaria ([icp-and-positioning.md](business/icp-and-positioning.md)) e [sobre-mim.md](sobre-mim.md) (rascunho, aguardando revisão do responsável).

## Próximo passo exato

1. **Fase 1 (IA real):** quando o responsável colocar a chave da Anthropic, montar ~30 documentos fictícios realistas (PDF, foto, XML, texto e alguns maliciosos), rodar a classificação com o Claude real e registrar acerto e custo em `docs/test-matrix.md` (avaliações).
2. **Fase 1b:** entrevistas de descoberta ([customer-interviews.md](validation/customer-interviews.md)), em paralelo.
