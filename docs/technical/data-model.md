# Modelo de dados

Fonte da verdade: [`src/db/schema.sql`](../../src/db/schema.sql). Este documento explica as decisões; não repete colunas.

## Tabelas por domínio

| Domínio | Tabelas | Acesso do papel `app_user` |
|---|---|---|
| Identidade | `organizations`, `users`, `memberships`, `sessions` | **nenhum** (só o código de sistema em `src/core/auth`, `src/core/orgs`) |
| Criação | `agent_definitions` (RLS), `agent_versions` (RLS + imutável) | dono lê e escreve; versão listada ou instalada é lida por quem pode vê-la |
| Catálogo | `catalog_listings` (RLS), `plans` | anúncio listado é público; planos só para leitura |
| Contratação | `installations`, `subscriptions`, `connections`, `budget_periods` (RLS) | só a própria organização; `subscriptions` sem UPDATE |
| Dados do cliente | `client_companies`, `documents` (RLS) | só a própria organização |
| Execução | `runs`, `run_steps`, `approvals`, `outbound_messages`, `usage_events` (RLS) | só a própria organização |
| Plataforma | `billing_events`, `platform_settings`, `audit_log` (RLS: a organização lê e insere os próprios registros) | `billing_events` e `platform_settings` sem acesso; o interruptor global é lido pela função `platform_kill_switch()` |

## Invariantes garantidos pelo banco (não só pelo código)

| Invariante | Mecanismo | Teste |
|---|---|---|
| Uma organização não lê nem grava dados de outra | RLS `tenant_isolation` + papel `app_user` sem BYPASSRLS | ISO-06, ISO-07 |
| Versão publicada não muda | Gatilho `agent_versions_immutable` | AGT-12 |
| Gasto + reservado ≤ limite do mês | `CHECK` em `budget_periods` + `UPDATE` condicional | BIL-01, BIL-02 |
| Limites da instalação ≤ teto do plano | Gatilho `installations_plan_caps` | BIL-07 |
| Limite do mês ≤ orçamento da instalação | Gatilho `budget_periods_limit` | BIL-07 |
| Cliente não altera preço nem status da assinatura | Sem `UPDATE` em `subscriptions`; sem escrita em `plans` | BIL-07 |
| Uma mensagem por chave de idempotência | `UNIQUE (installation_id, idempotency_key)` em `outbound_messages` | RUN-10 a RUN-13 |
| Uma aprovação por ação | `UNIQUE (installation_id, idempotency_key)` em `approvals` | RUN-03 |
| Uma execução por chave | `UNIQUE (installation_id, idempotency_key)` em `runs` | RUN-05 |
| Evento de pagamento processado uma vez | PK `provider_event_id` em `billing_events` | BIL-09 |

## Dinheiro e unidades

- Valores em **centavos de BRL** (`integer`). O custo de cada chamada de modelo é arredondado para cima, com mínimo de 1 centavo.
- Custo de IA usa preços oficiais [S22] e câmbio PTAX de 09/10/2026 [S01] (`src/core/runtime/costs.ts`).
- No modo simulado, o custo é **simulado** (estimado como se fosse o modelo configurado), e a interface avisa isso.

## Retenção e exclusão (proposta, a validar juridicamente)

| Dado | Retenção proposta | Observação |
|---|---|---|
| Documentos dos clientes (texto) | Competência atual + 2 meses | O escritório já guarda o original no próprio sistema |
| Mensagens enviadas e aprovações | 13 meses | Prova de comunicação; avaliar com advogado |
| Passos de execução e uso | 13 meses | Suporte e cobrança |
| Auditoria | 5 anos | Avaliar exigência legal |
| Sessões | 8 h de validade; remoção periódica | — |

**Exclusão de conta:** apagar dados da organização em cascata, exceto registros fiscais e de cobrança com obrigação legal. **Não implementado.** Fica como pendência em [assumptions-and-risks.md](../assumptions-and-risks.md).

## Migrações

O MVP aplica `schema.sql` inteiro em banco vazio. Antes de produção, isso precisa virar migrações versionadas, reversíveis quando possível, com plano de recuperação para as destrutivas ([runbook.md](../operations/runbook.md)).
