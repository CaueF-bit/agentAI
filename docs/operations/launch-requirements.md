# Requisitos de lançamento: estado atual

Aplica os bloqueios do `CLAUDE.md` §10 e §11 ao estado real do projeto em **2026-10-11**. O modelo genérico do checklist está em [release-checklist.md](../release-checklist.md).

**Veredito: NÃO está pronto para produção nem para clientes reais.** Pode ser usado como demonstração local ou como prévia protegida (se autorizada), com dados fictícios.

## Bloqueios de produção

| Bloqueio (§10) | Estado | Evidência / o que falta |
|---|---|---|
| Testes obrigatórios falhando ou não executados | ✅ ok | 68 de 68 aprovados (`npm test`); ver [test-matrix.md](../test-matrix.md) |
| Menos de 50 cenários relevantes aprovados | ✅ ok | 68 cenários distintos |
| Falhas conhecidas de isolamento, autenticação ou autorização | ❌ bloqueia | **Não há autenticação de produção** (só login de demonstração); concorrência não testada em Postgres real |
| Segredos expostos | ✅ ok (verificação simples) | `npm run secrets:scan` sem ocorrências; falta gitleaks na CI e verificação do histórico |
| Vulnerabilidades críticas ou altas | ✅ ok hoje | `npm audit --omit=dev`: 0 vulnerabilidades em 2026-10-11; precisa rodar na CI a cada mudança |
| Risco de cobrança duplicada ou gasto sem controle | 🟡 mitigado no MVP | Idempotência e orçamento testados; falta reaper de execuções abandonadas e rate limit |
| Integração simulada apresentada como real | ✅ ok | Faixa de demonstração em todas as páginas; documentação explícita |
| Avaliação de funcionalidade de IA essencial | ❌ bloqueia | Nenhuma avaliação real ([evaluations.md](../technical/evaluations.md)) |
| Migração destrutiva sem plano | ❌ bloqueia | Não há migrações versionadas, só o esquema inicial |
| Autorização para publicar | ❌ bloqueia | Não concedida |

## Antes de clientes reais (§11)

| Requisito | Estado |
|---|---|
| Acompanhamento de erros, falhas e consumo anormal | ❌ Logs redigidos existem; falta ferramenta (ex.: Sentry) e alertas |
| Dados sensíveis mascarados nos logs | ✅ `logger` com redação (SEC-04) |
| Registro de ações administrativas | ✅ `audit_log` |
| Backups e restauração testada | ❌ Depende do banco gerenciado |
| Rollback de aplicação e de migrações documentado | 🟡 [runbook.md](runbook.md); falta testar |
| Forma de interromper execuções | ✅ Pausa por instalação + interruptor global (RUN-14, RUN-15) |
| Verificações pós-publicação e resposta a falhas | 🟡 `/api/health` + [runbook.md](runbook.md) |

## Publicação: proteções configuradas

| Proteção | Estado |
|---|---|
| CI com lockfile, lint, tipos, testes, build, segredos e dependências | ✅ Rodando no GitHub; aprovada no commit `e7243b9` (execução 38324367854) |
| Branch `main` protegida exigindo os checks | ❌ Não configurada. Exige admin do repositório (Settings → Branches) |
| Vercel: produção só a partir de commit aprovado | 🟡 `vercel.json` desliga deploy automático da `main` (só prévias). Projeto Vercel ainda não criado |
| Prévias protegidas (Vercel Authentication) | ❌ Depende do projeto Vercel |
| Bloqueio de deploy por CLI e de promoção de prévia sem checks | ❌ Depende do projeto Vercel e de política da equipe |

O que falta, exatamente: acesso de administrador ao repositório `CaueF-bit/agentAI` (proteção de branch) e uma conta ou time na Vercel com permissão para criar o projeto, ativar Deployment Protection e configurar os checks obrigatórios. **Nada disso foi feito nem está ativo.**

## Temas que exigem análise profissional antes do lançamento

- LGPD: papéis de controlador e operador entre escritório e plataforma, base legal, contrato de tratamento de dados, transferência internacional (API de modelo fora do Brasil), retenção e exclusão.
- Sigilo profissional contábil (Código de Ética do CFC) e consentimento das empresas-cliente.
- Termos de uso, SLA e responsabilidade por mensagens enviadas pelo agente.
- Tributação e emissão de nota fiscal, inclusive dos repasses a criadores (split).
- Regras do WhatsApp Business (templates, opt-in).
