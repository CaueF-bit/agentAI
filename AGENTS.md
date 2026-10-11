# AGENTS.md

As regras deste projeto para agentes de código (Claude Code, Codex, Cursor etc.) estão em [`CLAUDE.md`](CLAUDE.md), que é a fonte única. Leia esse arquivo inteiro antes de qualquer alteração.

Resumo do que nunca pode ser ignorado:

- Evidência de funcionamento (testes executados), não código que "parece funcionar".
- Mínimo de 50 cenários automatizados relevantes aprovados antes da primeira publicação em produção.
- Autorização e isolamento entre organizações validados no servidor; nunca confiar em `organization_id` vindo do cliente.
- Nenhum segredo no Git, no frontend, em logs ou em prompts.
- Saídas do modelo são não confiáveis; permissões aplicadas por código fora do modelo.
- Sem publicação em produção, gastos ou ações reais em serviços externos sem autorização explícita do responsável.

Registros vivos: [`docs/test-matrix.md`](docs/test-matrix.md), [`docs/decisions.md`](docs/decisions.md), [`docs/risks-and-pending.md`](docs/risks-and-pending.md), [`docs/release-checklist.md`](docs/release-checklist.md).
