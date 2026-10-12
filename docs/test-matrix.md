# Matriz de testes

Relaciona requisito → risco → teste → resultado. Regras de contagem em `CLAUDE.md` §2. Os resultados abaixo vêm de execução real (`npm test`, Vitest 5.0.3, Node 24.15) em **2026-10-11**.

Todos os testes usam banco em memória novo e dados fictícios. A IA é o provedor **simulado**; o que isso comprova está em [evaluations.md](technical/evaluations.md).

## Resumo

| Categoria | Referência | Implementados | Aprovados | Falhos | Ignorados | Arquivo |
|---|---|---|---|---|---|---|
| Autenticação, autorização e isolamento | 10 | 15 | 15 | 0 | 0 | `tests/auth-isolation.test.ts` |
| Agentes: criação, validação, versionamento, instalação | 10 | 13 | 13 | 0 | 0 | `tests/agents.test.ts` |
| Execução, permissões, falhas, limites, repetição | 10 | 17 | 17 | 0 | 0 | `tests/runtime.test.ts` |
| Planos, consumo, contratação, cobrança (teste) | 8 | 10 | 10 | 0 | 0 | `tests/billing-budget.test.ts` |
| Dados, integrações, entradas maliciosas | 7 | 8 | 8 | 0 | 0 | `tests/data-security-secrets.test.ts` |
| Jornadas completas | 5 | 5 | 5 | 0 | 0 | `tests/journeys.test.ts` |
| **Total** | **50 (piso)** | **68** | **68** | **0** | **0** | |

**Última execução completa:** 68/68 aprovados, depois da correção do teste intermitente BIL-08 ([decisions.md](decisions.md)).

**Tipos de teste:**
- unitários: validação de especificação, redação de segredos, cifra, modelo financeiro;
- integração: núcleo + banco real Postgres/PGlite com RLS;
- jornada completa: sessão → domínio → banco.

**Não há teste automatizado de interface no navegador.** A interface foi verificada manualmente em 2026-10-11 (login, execução, aprovação, construtor, sandbox). Lacuna registrada em [assumptions-and-risks.md](assumptions-and-risks.md).

## Testes obrigatórios (CLAUDE.md §3)

| ID | Requisito | Risco | Teste(s) | Resultado |
|---|---|---|---|---|
| OBR-01 | Deslogado não acessa recursos privados | Vazamento | AUTH-01, AUTH-02 | aprovado |
| OBR-02 | Org A não lê/altera/exclui/executa recursos da org B | Vazamento entre clientes | ISO-01, ISO-02, ISO-03, ISO-04, ISO-06, JOR-05 | aprovado (*exclusão: não há operação de exclusão no MVP*) |
| OBR-03 | Trocar IDs em URL/requisição não atravessa organizações | IDOR | ISO-03, ISO-05 | aprovado |
| OBR-04 | Usuário comum não vira admin manipulando requisição | Escalada de privilégio | PRIV-01, PRIV-02, PRIV-03 | aprovado |
| OBR-05 | Revogar acesso bloqueia novas ações | Acesso residual | PRIV-04, JOR-05 | aprovado |
| OBR-06 | Instalações do mesmo agente não compartilham dados/credenciais | Vazamento entre instalações | AGT-13, SEC-02 | aprovado |
| OBR-07 | Especificação inválida gerada pela IA é rejeitada | Configuração insegura | AGT-03..AGT-08, AGT-10 | aprovado |
| OBR-08 | Agente não chama ferramenta sem permissão | Ação não autorizada | RUN-06 | aprovado |
| OBR-09 | Conteúdo externo malicioso não autoriza ações | Injeção de instruções | RUN-02, SEC-08 | aprovado (só com provedor simulado; avaliação real pendente) |
| OBR-10 | Limite de orçamento resiste a execuções simultâneas | Gasto sem controle | BIL-01, BIL-02 | aprovado (*PGlite: conexão única; falta teste em Postgres real*) |
| OBR-11 | Timeout ou falha externa não gera repetição ilimitada | Loop de custo | RUN-07, RUN-11 | aprovado |
| OBR-12 | Retentativas não duplicam cobranças nem ações externas | Duplicidade | RUN-10, RUN-12, RUN-13, BIL-05, RUN-05 | aprovado |
| OBR-13 | Pausar impede novas execuções; em andamento segue regra documentada | Execução indevida | RUN-14, RUN-15, JOR-04 | aprovado (regra D-009) |
| OBR-14 | Versão publicada não muda após editar rascunho | Mudança silenciosa | AGT-11, AGT-12 | aprovado |
| OBR-15 | Frontend não define preço nem privilégio de plano | Fraude de preço | BIL-06, BIL-07, BIL-04 | aprovado |
| OBR-16 | Webhook inválido rejeitado; evento repetido não duplica | Fraude/duplicidade | BIL-08, BIL-09 | aprovado |
| OBR-17 | Logs e respostas de erro não expõem segredos | Vazamento de segredo | SEC-03, SEC-04, SEC-05 | aprovado |

## Demais requisitos críticos cobertos

| Requisito | Risco | Teste(s) |
|---|---|---|
| Aprovação vinculada à ação e aos parâmetros exibidos | Envio de algo diferente do aprovado | RUN-03, RUN-04 |
| Limites de passos, tempo, custo e concorrência | Execução sem fim, custo | RUN-07, RUN-08, RUN-17 |
| Saída inválida do modelo não derruba a execução; lembrete com link bloqueado | Phishing, falha em cascata | RUN-09 |
| Assinatura inativa bloqueia uso | Uso sem pagamento | RUN-16, JOR-02 |
| Interruptor global | Incidente sem freio | RUN-15 |
| Credencial cifrada e nunca devolvida | Vazamento de credencial | SEC-01 |
| RLS com papel real e tabelas de sistema fechadas | Bypass do código | ISO-06, ISO-07 |
| Entradas maliciosas tratadas como dado | Injeção de SQL e caminhos | SEC-07 |
| Login de demonstração desligado fora do modo demo | Acesso sem autenticação em produção | AUTH-03 |
| Receita reconhece só a parcela retida | Superestimar receita | BIL-10 |

## Avaliações de IA (separadas dos testes acima)

| ID | Caso | Critério de sucesso (definido antes) | Modelo/versão | Config | Custo | Resultado | Data |
|---|---|---|---|---|---|---|---|
| — | Conjunto A–F de [evaluations.md](technical/evaluations.md) | ver documento | — | — | — | **não executado** (sem credencial e orçamento autorizados) | — |
