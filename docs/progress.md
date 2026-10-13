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

## Bloqueios (exigem decisão ou autorização do responsável)

- Commit e push deste trabalho para o GitHub: **aguardando autorização**.
- Proteção de branch no GitHub e projeto na Vercel: exigem acesso de administrador.
- Avaliação real da IA: exige credencial e orçamento autorizados.
- Análise jurídica e de LGPD antes de qualquer cliente real.

## Próximo passo exato

1. Rodar as entrevistas de descoberta ([docs/validation/customer-interviews.md](validation/customer-interviews.md)).
2. Em paralelo, a fase 2 do [roadmap](roadmap.md), começando pela escolha do provedor de autenticação e do banco gerenciado, seguida do adaptador `pg` e do teste de concorrência em Postgres real.
