# AgentAI (nome de trabalho)

Plataforma premium para **criar, vender, contratar e operar agentes de IA** em um nicho específico.

- **Nicho provisório:** escritórios de contabilidade no Brasil.
- **Primeiro fluxo:** **Agente de Fechamento Mensal**, que cobra, recebe, confere e organiza os documentos de cada empresa-cliente, com aprovação humana e limites de gasto.

> **Estado: MVP de DEMONSTRAÇÃO, versão incompleta.** Dados fictícios. IA, pagamentos e mensagens são **simulados**. Não está pronto para produção nem para clientes reais. Os bloqueios estão em [docs/operations/launch-requirements.md](docs/operations/launch-requirements.md).

## Rodar localmente

Requisitos: Node.js 22 ou superior (testado com 24.15) e npm. Não precisa de Docker nem de banco externo: o Postgres roda embutido (PGlite).

```bash
npm ci
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Abra http://localhost:3000. Na primeira inicialização, os dados fictícios são criados em `.data/` (fora do Git). Entre por **"Entrar na demonstração"** e escolha uma persona:

| Persona | O que testar |
|---|---|
| **Diego** (criador) | Criador → "Novo agente por descrição" → montar especificação → salvar → teste em sandbox → publicar |
| **Ana** (sócia do escritório) | Painel → instalação → simular pagamento, limites, conexão, pausa, **aprovar lembretes** |
| **Bruno** (assistente) | Executar o agente (não pode aprovar, pausar nem mudar limites) |
| **Carla** (outro escritório) | Isolamento: não enxerga nada da Horizonte |
| **Operadora** | Interruptor global, retirar anúncio do catálogo, auditoria |

Para recomeçar com dados limpos, pare o servidor e rode:

```bash
npm run demo:reset
```

## Verificações

```bash
npm test
```

```bash
npm run check
```

O `check` roda lint, tipos, os 68 testes, a verificação de segredos e o build de produção. Para recalcular o modelo financeiro (TAM/SAM/SOM, margem e sensibilidade, gerados em `finance/output/`):

```bash
npm run finance
```

## O que é real e o que é simulado

| Parte | Situação |
|---|---|
| Isolamento por organização (servidor + RLS no Postgres), papéis, revogação | **Real** e testado |
| Validação da especificação, lista fechada de ferramentas, limites, orçamento, pausa, aprovação vinculada | **Real** e testado |
| Idempotência, retentativas limitadas, consulta antes de repetir | **Real** e testado contra um canal simulado com falhas programadas |
| Cifra de credenciais (AES-256-GCM, chave fora do banco) | **Real** e testado |
| IA construtora, classificação e redação | **Simulada** (regras). O adaptador Anthropic existe, mas **nunca foi executado** |
| Pagamentos | **Simulados** (provedor "testpay"), com webhook assinado de verdade |
| E-mail e WhatsApp | **Simulados**; nada sai da plataforma |
| Login | **Demonstração** (sem senha). Precisa de provedor consolidado antes de produção |

## Navegação

| Tema | Documento |
|---|---|
| Regras do projeto (qualidade, segurança, testes, publicação) | [CLAUDE.md](CLAUDE.md), [AGENTS.md](AGENTS.md) |
| Visão | [docs/vision.md](docs/vision.md) |
| Pesquisa: fontes, mercado, nicho, concorrentes | [docs/research/](docs/research/) — comece por [sources.md](docs/research/sources.md) |
| Negócio: ICP, TAM/SAM/SOM, preço, economia, go-to-market | [docs/business/](docs/business/) + [finance/](finance/) |
| Produto: PRD, jornadas, escopo do MVP | [docs/product/](docs/product/) |
| Técnico: arquitetura, dados, runtime, segurança, avaliações de IA | [docs/technical/](docs/technical/) |
| Operação: runbook, requisitos de lançamento | [docs/operations/](docs/operations/) |
| Validação: entrevistas, piloto | [docs/validation/](docs/validation/) |
| Testes, decisões, riscos, progresso, roadmap | [test-matrix](docs/test-matrix.md) · [decisions](docs/decisions.md) · [assumptions-and-risks](docs/assumptions-and-risks.md) · [progress](docs/progress.md) · [roadmap](docs/roadmap.md) |

## Estrutura do código

```
src/app/          páginas Next.js (App Router), ações de servidor, rotas /api
src/components/   componentes de interface (editor de especificação, construtor, sandbox)
src/core/         domínio, sem dependência do Next: auth, agents, ai, approvals, billing,
                  budget, catalog, clients, installations, orgs, runtime, security, system
src/db/           schema.ts (RLS, gatilhos), cliente do banco, dados fictícios
tests/            68 cenários (Vitest) — ver docs/test-matrix.md
finance/          premissas editáveis + calculadora reproduzível
scripts/          verificação de segredos
```

## Pendências de decisão

Nome definitivo da empresa e licença do código **não foram escolhidos** ([docs/decisions.md](docs/decisions.md)). Sem arquivo LICENSE, todos os direitos ficam reservados por padrão.
