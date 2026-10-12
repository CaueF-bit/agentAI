# Segurança e permissões

Regras gerais no [`CLAUDE.md`](../../CLAUDE.md). Aqui está **como** elas foram implementadas e **onde** são testadas. Nada aqui afirma conformidade legal nem certificação.

## Camadas de isolamento entre organizações

1. **Identidade no servidor:** `requireActor` resolve usuário → sessão → filiação **ativa** → organização ativa a cada ação. Nenhum formulário envia `org_id`, papel ou preço.
2. **Consultas com filtro explícito** `org_id = ator.orgId`. Um recurso de outra organização gera `not_found` (não `forbidden`), para não confirmar que ele existe.
3. **RLS no banco** com `app.org_id` por transação e o papel `app_user`, que não ignora RLS. Os testes usam **esse papel**, não uma conta administrativa (ISO-06).
4. **Tabelas de sistema** (sessões, usuários, filiações, eventos de cobrança, configurações) sem permissão para `app_user` (ISO-07).

O controle cobre documentos, execuções, passos, aprovações, mensagens, uso, credenciais e orçamento. Busca, fila e cache ainda não existem. Quando existirem, **devem** carregar `org_id` e passar pelas mesmas camadas (pendência registrada).

## Credenciais

- AES-256-GCM (Node `crypto`) com chave em variável de ambiente, **fora do banco**, e `key_id` registrado para rotação.
- A cifra é vinculada à instalação (associated data = `installation_id`): um texto cifrado copiado para outra instalação não abre (SEC-02).
- A interface mostra só os 4 últimos caracteres; a auditoria não registra o segredo (SEC-01, SEC-03).
- Sem chave fora do modo demo, a aplicação **não inicia**. No modo demo, a chave é aleatória por processo.

## Segredos em logs e erros

- O `logger` e a auditoria passam por `redactValue`/`redactString`: chaves Anthropic, OpenAI e Stripe, `whsec_`, GitHub, AWS, JWT, URLs de banco, `Bearer` e campos com nome sensível (SEC-04).
- `toPublicError` devolve uma mensagem genérica e um ID de correlação para erros inesperados (SEC-05).
- O verificador `npm run secrets:scan` analisa arquivos rastreados e não ignorados, sem imprimir o valor encontrado (SEC-06). **Não substitui** uma ferramenta dedicada como o gitleaks na CI.

## Limites da IA

| Regra | Implementação | Teste |
|---|---|---|
| Saídas do modelo não são confiáveis | Zod estrito em especificação, classificação e lembrete | AGT-03..06, RUN-09 |
| Lista explícita de ferramentas | Registro fechado `TOOL_IDS` + checagem por chamada | AGT-03, RUN-06 |
| Instruções separadas do conteúdo recuperado | O documento vai só para a classificação; a redação recebe só campos estruturados | SEC-08, RUN-02 |
| Agente não aumenta as próprias permissões | Nenhuma ferramenta escreve em instalação, plano, orçamento ou filiação; a especificação estrita não aceita `price`/`role`/`permissions` | AGT-04 |
| Limites de tempo, passos, chamadas, custo e concorrência | `callTool` + início atômico da execução | RUN-07, RUN-08, RUN-17 |
| Controle de gasto com concorrência | Reserva atômica + `CHECK` | BIL-01, BIL-02 |
| Aprovação vinculada à ação e aos parâmetros | `params_hash` | RUN-03, RUN-04 |
| Execução de código | **Não existe** no MVP: só componentes conhecidos | — |
| Acesso a URLs | **Não existe** ferramenta de rede. Se for criada: lista de destinos permitidos, bloqueio de IPs privados, link-local e endpoints de metadados de nuvem, e resolução de DNS verificada | pendente |

Um prompt de segurança não é usado como barreira. O adaptador Anthropic tem instruções de sistema, mas os controles acima valem igualmente com o provedor simulado.

## Webhooks de pagamento

- HMAC-SHA256 sobre `timestamp.corpo`, tolerância de 5 minutos, comparação em tempo constante (BIL-08).
- Evento repetido → `duplicate`; evento mais antigo que o último aplicado → `stale_ignored` (BIL-09).
- O status e o preço da assinatura só mudam pelo código de sistema.

## Riscos residuais conhecidos

Lista viva em [assumptions-and-risks.md](../assumptions-and-risks.md).

- O login de demonstração não é autenticação de produção.
- A concorrência ainda não foi testada em Postgres real.
- Não há limite de taxa (rate limit) por usuário ou IP.
- Não há proteção explícita contra abuso no construtor (custo de chamadas reais).
- Exclusão e retenção de dados não implementadas.
- LGPD, termos de uso, sigilo profissional contábil e tributação dos repasses **exigem análise profissional** antes de qualquer cliente real.
