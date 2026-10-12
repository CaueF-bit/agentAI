# PRD — MVP de demonstração

Contexto em [vision.md](../vision.md). O escopo exato (dentro e fora) está em [mvp-scope.md](mvp-scope.md) e as jornadas em [user-journeys.md](user-journeys.md).

## Problema

Escritórios contábeis gastam horas todo mês cobrando, recebendo e conferindo documentos de dezenas de clientes por canais manuais. **Hipótese a validar** ([icp-and-positioning.md](../business/icp-and-positioning.md)).

## Objetivo do MVP

Demonstrar, com dados fictícios e integrações simuladas, o ciclo completo:

**descrever → especificar → validar → testar → publicar → contratar (teste) → configurar → executar com limites → acompanhar**

Cada controle crítico deve ter teste automatizado.

## Conceitos do domínio

| Conceito | Definição | Onde fica |
|---|---|---|
| Definição do agente | Rascunho reutilizável, editável pelo criador | `agent_definitions.draft_spec` |
| Versão publicada | Cópia imutável da especificação, numerada | `agent_versions` |
| Anúncio do catálogo | Página pública que aponta para a última versão e os planos | `catalog_listings`, `plans` |
| Instalação | Contratação de um comprador, presa a uma versão, com orçamento e limites próprios | `installations` |
| Conexões | Credenciais e canais **daquela instalação**, cifrados | `connections` |
| Empresas-cliente e documentos | Dados privados do comprador | `client_companies`, `documents` |
| Execução | Uma rodada do agente em uma competência | `runs`, `run_steps` |
| Consumo e cobrança | Orçamento por período, eventos de uso, assinatura e eventos do provedor | `budget_periods`, `usage_events`, `subscriptions`, `billing_events` |

## Histórias de usuário e critérios de aceitação

### Criador

**C1 — Descrever um agente em linguagem natural.**
- [ ] Ao enviar a descrição, o sistema retorna uma especificação estruturada e uma lista de **informações faltantes** em forma de perguntas.
- [ ] A especificação gerada pela IA passa por validação de esquema e de regras. Especificação inválida é **rejeitada** com motivo, sem salvar.
- [ ] Ferramentas fora da lista permitida, campos desconhecidos (por exemplo, preço ou papéis) e limites acima do teto da plataforma são rejeitados.

**C2 — Editar e testar.**
- [ ] O criador edita a especificação em formulário estruturado. O servidor valida a cada salvamento.
- [ ] O teste em sandbox executa o fluxo com dados fictícios, **sem enviar mensagens**, e mostra a linha do tempo de passos, custo estimado e pendências.

**C3 — Publicar versão.**
- [ ] Publicar cria a versão N+1 imutável, com hash da especificação.
- [ ] Editar o rascunho depois **não altera** versões publicadas nem instalações existentes.
- [ ] Só owner ou admin da organização criadora publica.

### Comprador

**B1 — Explorar o catálogo.** Catálogo curado com agentes marcados como **exemplo fictício**. A página de detalhe mostra o que o agente faz, as ferramentas, as aprovações e os planos.

**B2 — Contratar (modo de teste).**
- [ ] O preço vem do plano no servidor; valores enviados pelo navegador são ignorados.
- [ ] A assinatura começa pendente e só fica ativa após evento de pagamento **simulado e assinado**.

**B3 — Configurar.**
- [ ] Conexões (canal de e-mail ou WhatsApp simulado) são cadastradas por instalação. O segredo nunca volta ao navegador, só a versão mascarada.
- [ ] O orçamento mensal e o limite de execuções simultâneas são definidos por owner ou admin, dentro do teto do plano.

**B4 — Executar e acompanhar.**
- [ ] "Executar agora" cria uma execução idempotente. O painel mostra status, passos, documentos classificados, pendências por cliente, mensagens e consumo.
- [ ] Mensagens que exigem aprovação aparecem na fila de aprovações. Aprovar executa **exatamente** a ação e os parâmetros aprovados.

**B5 — Controlar.**
- [ ] Pausar impede novas execuções. Execuções em andamento param no próximo passo, conforme a regra em [agent-runtime.md](../technical/agent-runtime.md).
- [ ] Ao atingir o orçamento, novas chamadas pagas são bloqueadas, mesmo com execuções simultâneas.

### Operador

**O1 — Interrupção de emergência.** Um interruptor global impede o início de qualquer execução e para as que estão em andamento no próximo passo.

**O2 — Moderação do catálogo.** Retirar um anúncio do catálogo sem acessar dados privados dos compradores.

**O3 — Auditoria.** Consultar o registro de ações administrativas.

## Requisitos não funcionais

- **Isolamento:** autorização no servidor + RLS no banco, testada com o papel da aplicação ([security-and-permissions.md](../technical/security-and-permissions.md)).
- **Segredos:** nenhum segredo em código, logs ou respostas.
- **Idempotência:** nenhuma ação externa nem cobrança duplicada em retentativas.
- **Modo de demonstração:** identificado em toda página e na documentação.
