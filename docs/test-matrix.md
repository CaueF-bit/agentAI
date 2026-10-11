# Matriz de testes

Relaciona requisito → risco → teste → resultado. Regras de contagem em `CLAUDE.md` §2.

**Resultado** só pode ser preenchido com execução real: `aprovado`, `falhou`, `ignorado` ou `não implementado`. Testes ignorados ou não executados não contam como aprovados.

## Resumo

| Categoria | Meta de referência | Implementados | Aprovados | Falhos | Ignorados |
|---|---|---|---|---|---|
| Autenticação, autorização e isolamento | 10 | 0 | 0 | 0 | 0 |
| Agentes: criação, validação, versionamento, instalação | 10 | 0 | 0 | 0 | 0 |
| Execução, permissões, falhas, limites, repetição | 10 | 0 | 0 | 0 | 0 |
| Planos, consumo, contratação, cobrança (teste) | 8 | 0 | 0 | 0 | 0 |
| Dados, integrações, entradas maliciosas | 7 | 0 | 0 | 0 | 0 |
| Jornadas completas | 5 | 0 | 0 | 0 | 0 |
| **Total** | **50 (piso)** | **0** | **0** | **0** | **0** |

Última execução: — (nenhuma)

## Testes obrigatórios (CLAUDE.md §3)

Aplicabilidade a confirmar quando o escopo do MVP for definido.

| ID | Requisito | Risco | Tipo | Teste (arquivo::nome) | Resultado |
|---|---|---|---|---|---|
| OBR-01 | Deslogado não acessa recursos privados | Vazamento de dados | integração | — | não implementado |
| OBR-02 | Org A não lê/altera/exclui/executa recursos da org B | Vazamento entre clientes | integração | — | não implementado |
| OBR-03 | Trocar IDs em URL/requisição não atravessa organizações | IDOR | integração | — | não implementado |
| OBR-04 | Usuário comum não vira admin manipulando requisição | Escalada de privilégio | integração | — | não implementado |
| OBR-05 | Revogar acesso bloqueia novas ações protegidas | Acesso residual | integração | — | não implementado |
| OBR-06 | Instalações do mesmo agente não compartilham dados/credenciais | Vazamento entre instalações | integração | — | não implementado |
| OBR-07 | Especificação inválida gerada pela IA é rejeitada | Configuração insegura | unitário | — | não implementado |
| OBR-08 | Agente não chama ferramenta sem permissão | Ação não autorizada | unitário/integração | — | não implementado |
| OBR-09 | Conteúdo externo malicioso não autoriza novas ações | Prompt injection | integração | — | não implementado |
| OBR-10 | Limite de orçamento resiste a execuções simultâneas | Gasto sem controle | concorrência | — | não implementado |
| OBR-11 | Timeout/falha externa não gera repetição ilimitada | Loop de custo | integração | — | não implementado |
| OBR-12 | Retentativas não duplicam cobranças nem ações externas | Cobrança/ação duplicada | integração | — | não implementado |
| OBR-13 | Pausar agente impede novas execuções; em andamento seguem regra documentada | Execução indevida | integração | — | não implementado |
| OBR-14 | Versão publicada não muda após edição de rascunho | Mudança silenciosa para clientes | integração | — | não implementado |
| OBR-15 | Frontend não define preço nem privilégio de plano | Fraude de preço | integração | — | não implementado |
| OBR-16 | Webhook inválido rejeitado; evento repetido não duplica operação | Fraude/duplicidade | integração | — | não implementado |
| OBR-17 | Logs e respostas de erro não expõem segredos | Vazamento de segredo | unitário/integração | — | não implementado |

## Demais cenários

| ID | Categoria | Requisito | Risco | Tipo | Teste (arquivo::nome) | Resultado |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — |

## Avaliações de IA (separadas dos testes acima, CLAUDE.md §7)

| ID | Caso | Critério de sucesso (definido antes) | Modelo/versão | Config | Custo | Resultado | Data |
|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — |
