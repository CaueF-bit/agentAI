# AGENTS.md

As regras deste projeto para agentes de código (Claude Code, Codex, Cursor etc.) estão em [`CLAUDE.md`](CLAUDE.md), que é a fonte única. Leia esse arquivo inteiro antes de qualquer alteração.

Resumo do que nunca pode ser ignorado:

- Evidência de funcionamento (testes executados), não código que "parece funcionar".
- Mínimo de 50 cenários automatizados relevantes aprovados antes da primeira publicação em produção.
- Autorização e isolamento entre organizações validados no servidor; nunca confiar em `organization_id` vindo do cliente.
- Nenhum segredo no Git, no frontend, em logs ou em prompts.
- Saídas do modelo são não confiáveis; permissões aplicadas por código fora do modelo.
- Sem publicação em produção, gastos ou ações reais em serviços externos sem autorização explícita do responsável.

## Como trabalhar neste código

- **Comece por** [`docs/progress.md`](docs/progress.md) (estado e próximo passo) e [`README.md`](README.md) (como rodar).
- **Domínio** em `src/core` (sem Next). Toda leitura ou escrita de dados de cliente usa `db.asTenant(...)`, que aplica RLS com o papel `app_user`. `db.asSystem(...)` é só para autenticação, catálogo público, webhooks e operador.
- **Identidade** sempre por `requireActor` (sessão). Nunca aceitar org, papel, preço ou limite vindo de formulário.
- **Nova ferramenta de agente:** registrar em `src/core/agents/tools.ts`, cobrir no motor (`callTool`) e adicionar testes de permissão e de limite.
- **Mudanças de esquema:** `src/db/schema.sql` + teste com o papel `app_user`. Antes de produção, isso precisa virar migração versionada.
- **Antes de entregar:** `npm run check`. Atualize [`docs/test-matrix.md`](docs/test-matrix.md) com os resultados reais.

Registros vivos: [`docs/test-matrix.md`](docs/test-matrix.md), [`docs/decisions.md`](docs/decisions.md), [`docs/assumptions-and-risks.md`](docs/assumptions-and-risks.md), [`docs/release-checklist.md`](docs/release-checklist.md).
