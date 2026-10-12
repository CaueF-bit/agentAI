# Runtime do agente

Código: [`src/core/runtime/engine.ts`](../../src/core/runtime/engine.ts) (motor), `runs.ts` (ciclo de vida), `dispatch.ts` (envio), `db-environment.ts` (portas no banco), `sandbox.ts` (portas em memória).

## Princípio

A orquestração é **código determinístico**. O modelo só faz duas coisas:

1. Classificar o tipo de um documento. A saída é um valor de uma lista fechada, validado com Zod.
2. Redigir o texto de um lembrete. A saída é validada: tamanho, sem links e sem pedido de credenciais.

O que executar, para quem, com qual permissão e até qual limite é decidido pelo motor, a partir da **versão publicada** da especificação e da configuração da instalação. O conteúdo dos documentos nunca vira instrução.

## Fluxo de uma execução

```
createRun (idempotente pela chave)
  → executeRun: transação com a instalação bloqueada (FOR UPDATE):
       interruptor global? pausada? assinatura ativa? concorrência < limite?
       → queued → running   (ou cancelled/failed com motivo)
  → runMonthlyCollection, para cada empresa-cliente:
       documents.list → documents.classify (cada documento ainda não classificado)
       → checklist.evaluate → [regras de lembrete] → messages.draft → messages.send
         (ou pedido de aprovação, conforme a política da instalação)
     → report.publish
  → grava status, passos, custo e resumo
```

## Porta única de ferramentas (`callTool`)

Antes de **cada** chamada, nesta ordem:

| Verificação | Resultado se falhar |
|---|---|
| Ferramenta está na especificação **e** no registro fechado | Passo `denied`; execução `failed / tool_not_allowed` |
| Passos < `maxStepsPerRun`; chamadas < `maxToolCallsPerRun` | `failed / limit_steps` ou `limit_tool_calls` |
| Tempo decorrido ≤ `runTimeoutSeconds` | `failed / timeout` |
| Instalação ativa e interruptor desligado (consulta ao banco) | `cancelled / paused` ou `kill_switch` |
| Custo da execução + estimativa ≤ `maxCostCentsPerRun` | `failed / limit_run_cost` |
| Reserva atômica no orçamento do mês | Passo `denied`; execução `budget_blocked` |

Depois da chamada, a reserva vira gasto real (nunca acima do reservado), com um evento de uso registrado. Uma saída inválida do modelo é cobrada pelo custo conhecido. Uma falha sem resposta debita o valor reservado, por segurança.

## Regra de pausa (documentada e testada em RUN-14)

- **Pausar** marca a instalação como `paused`. Novas execuções são recusadas (`cancelled / paused`).
- Uma execução **em andamento** termina a ferramenta atual e para **antes da próxima** com `cancelled / paused`. Não há interrupção no meio de uma chamada.
- Um envio já iniciado conclui as tentativas daquela mensagem. Ele não é cancelado no meio, para não deixar o resultado incerto.
- Aprovações pendentes continuam pendentes. Aprovar com o agente pausado retorna erro e não envia nada.
- O **interruptor global** do operador tem o mesmo efeito em todas as instalações (RUN-15).

## Envio, retentativas e idempotência

- **Chave de idempotência:** `competência:cliente:reminder:N`. Cada número de lembrete é consumido uma única vez: enviado, falho ou rejeitado.
- **Saída persistida (outbox):** a mensagem é registrada antes de enviar. Se já consta como `sent`, não reenvia.
- **Limite de tentativas:** no máximo **3**, com espera crescente (200 ms, 400 ms). Depois, `failed`, e o lembrete N não é tentado de novo (RUN-11).
- **Resultado desconhecido:** em tempo esgotado ou tentativa anterior sem registro de sucesso, o sistema **consulta o provedor** antes de repetir (RUN-12, RUN-13).
- **Cobrança:** o envio é cobrado uma vez, só se entregue, independentemente das tentativas (BIL-05).

## Aprovação humana

- A aprovação é vinculada a `params_hash = sha256(JSON canônico dos parâmetros)`, que inclui destinatário, canal, texto e chave.
- O formulário devolve o hash que a pessoa viu. Se os parâmetros guardados divergirem, nada é executado (RUN-04).
- O envio aprovado usa o texto aprovado, guardado na saída. O modelo não é chamado de novo.

## Concorrência

- Limite de execuções simultâneas por instalação, verificado com a linha da instalação bloqueada.
- Orçamento protegido por `UPDATE` condicional + `CHECK` (BIL-01, BIL-02).
- **Limitação conhecida:** o PGlite executa uma transação por vez. Os testes provam a ausência de condição de corrida no código (as operações se intercalam entre `await`s), mas **não** substituem um teste com Postgres real e várias conexões. Pendente antes de produção.

## Execuções longas e recuperação (pendente para o piloto)

No MVP, "Executar agora" roda dentro da requisição. Isso só é aceitável para dezenas de clientes com o provedor simulado. Para produção:

- fila durável + worker com tempo máximo compatível (ex.: Vercel Workflow/Queues ou worker dedicado);
- heartbeat por execução e um "reaper" que marca como `failed / abandoned` as execuções `running` sem heartbeat. Hoje, uma queda do processo deixaria a execução `running` e ocupando a vaga de concorrência;
- agendamento mensal real a partir de `schedule.startDay`.
