# Arquitetura

Um **monólito modular**: uma aplicação Next.js com o núcleo de domínio separado do framework. Não há microsserviços nem múltiplos agentes, porque nada no MVP exige isso (decisão D-003 em [decisions.md](../decisions.md)).

```
navegador ──► Next.js (App Router, Server Components + Server Actions)   src/app
                 │  identidade sempre resolvida no servidor (cookie → sessão → filiação)
                 ▼
             núcleo de domínio (TypeScript, sem dependência do Next)       src/core
               auth · agents · catalog · installations · clients · runtime
               budget · approvals · billing · system · security · ai
                 │                             │
                 ▼                             ▼
             banco Postgres (PGlite no MVP)   provedores externos via adaptador
             RLS por organização              ModelProvider (simulado | Anthropic)
             papel app_user                   ChannelAdapter (simulado)
                                              pagamento "testpay" (simulado, webhook assinado)
```

## Componentes

| Camada | Escolha no MVP | Por quê | Para produção |
|---|---|---|---|
| Frontend + backend | Next.js 16 (App Router), React 19, Tailwind 4 | Um só deploy na Vercel; Server Actions já verificam a origem das requisições | Igual |
| Domínio | `src/core`, TypeScript puro | Testável sem servidor HTTP; troca de framework não afeta regras | Igual |
| Banco | PGlite 0.5 (Postgres em WASM, embutido) | Roda sem serviço externo e com RLS real, que dá para testar com o papel da aplicação | Postgres gerenciado com TLS e criptografia em repouso (ex.: Neon via Marketplace da Vercel). Adaptador `pg` **implementado** (`createPgDb`), testado pelo protocolo de rede em servidor local (PG-01/02); ainda não executado contra um banco gerenciado |
| Autenticação | Login de **demonstração** com sessão opaca (hash SHA-256 no banco) | Permite testar papéis sem senha | Provedor consolidado (Clerk, Auth.js ou Supabase Auth), D-006 (**pendente**) |
| Validação | Zod 4 | Esquema estrito para tudo que vem da IA ou do navegador | Igual |
| IA | Interface `ModelProvider`; padrão simulado; adaptador Anthropic opcional | Funciona sem credenciais; o fornecedor é trocável | Anthropic com credencial autorizada + avaliações reais ([evaluations.md](evaluations.md)) |
| Mensagens | `SimulatedChannel` + saída de mensagens persistida no banco | Testa idempotência e falhas sem enviar nada | E-mail transacional e API oficial do WhatsApp (**pendente**) |
| Pagamentos | Provedor "testpay" simulado, com webhook HMAC | Testa assinatura, duplicidade e ordem dos eventos | Stripe ou provedor local, só em modo teste até haver autorização |
| Execução | Síncrona dentro da requisição ("Executar agora") | Simples para a demo | Fila durável + worker (ex.: Vercel Queues/Workflow) com heartbeat; ver [agent-runtime.md](agent-runtime.md) |

## Organizações, membros e papéis

- Uma **organização** pode ser criadora (`is_creator`), compradora (`is_buyer`) ou as duas.
- **Filiação** (`memberships`) tem papel `owner`, `admin` ou `member` e pode ser revogada (`revoked_at`).
- **Operador** é um atributo do usuário (`users.is_platform_admin`), não um papel na organização. O operador não tem filiação e não consegue agir como cliente.

| Ação | member | admin | owner | operador |
|---|---|---|---|---|
| Ver painel, executar agente, cadastrar cliente e documento | ✓ | ✓ | ✓ | — |
| Aprovar mensagens, pausar, mudar limites, conexões, contratar | — | ✓ | ✓ | — |
| Criar e publicar agentes (organização criadora) | — | ✓ | ✓ | — |
| Revogar membros (revogar owner só sendo owner) | — | ✓ | ✓ | — |
| Interruptor global, retirar anúncio, ver auditoria | — | — | — | ✓ |

Detalhes de isolamento em [security-and-permissions.md](security-and-permissions.md). Modelo de dados em [data-model.md](data-model.md).

## Catálogo, versões e instalações

```
agent_definitions (rascunho editável, privado do criador)
   └─ agent_versions v1, v2… (imutáveis: gatilho no banco impede UPDATE/DELETE; hash da especificação)
        └─ catalog_listings (aponta a última versão; listado ou retirado pelo operador)
             └─ plans (preço e tetos definidos pela plataforma)
installations (comprador, presa a UMA versão; troca só por ação explícita "atualizar")
   ├─ subscriptions (modo teste; status muda só por evento assinado)
   ├─ connections (credenciais cifradas por instalação)
   ├─ budget_periods (orçamento por mês)
   └─ runs → run_steps, approvals, outbound_messages, usage_events
```

## Separação teste × produção

- **Testes** usam banco em memória novo por arquivo (`tests/helpers.ts`). Nenhum teste conecta a banco persistente.
- **Demonstração local** usa `.data/pglite` (fora do Git), com dados fictícios carregados automaticamente.
- **Produção** exige: `DEMO_MODE=false` (desliga login de demonstração e pagamento simulado), chaves reais vindas de gerenciador de segredos e banco gerenciado. O código **recusa iniciar** sem `CREDENTIALS_ENCRYPTION_KEY` e `TESTPAY_WEBHOOK_SECRET` fora do modo demo (`src/core/config.ts`).
- Prévias na Vercel precisam de proteção e de bancos e credenciais separados ([launch-requirements.md](../operations/launch-requirements.md)).

## Operação assistida por IA

| A IA administrativa pode (futuro) | Depende de pessoa |
|---|---|
| Sugerir a classificação de anúncios no catálogo | Listar ou retirar anúncio |
| Detectar consumo ou falhas anormais e abrir alerta | Ligar o interruptor global, pausar a instalação de um cliente |
| Rascunhar resposta de suporte | Enviar resposta, conceder crédito, mudar plano, preço ou limite |

**Agentes nunca concedem permissão a si mesmos, nunca publicam alterações sensíveis e nunca aumentam limites financeiros.** No código, nenhuma ferramenta do registro (`src/core/agents/tools.ts`) escreve em instalações, planos, orçamento ou filiações.
