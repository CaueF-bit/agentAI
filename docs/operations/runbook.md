# Runbook

Procedimentos para a demonstração atual e para a operação futura. Itens marcados **(futuro)** dependem de infraestrutura que ainda não existe.

## Rodar localmente

Ver o [README](../../README.md). Para resetar os dados de demonstração, pare o servidor e apague `.data/`. Na próxima inicialização, os dados fictícios são recriados.

## Verificação rápida pós-publicação

1. `GET /api/health` → `{"ok":true,...}` e `demoMode` com o valor esperado. Em produção, **precisa** ser `false`.
2. Abrir `/catalogo` sem login: só anúncios listados.
3. Login de teste (futuro: conta de teste no provedor de autenticação) → abrir o painel → nenhum dado de outra organização.
4. Executar o agente numa instalação de teste em **conta de teste** e conferir o passo `report.publish`.
5. Conferir no monitoramento: nenhum erro 5xx novo (futuro).

## Incidentes

| Sintoma | Ação imediata | Depois |
|---|---|---|
| Agente enviando mensagens erradas ou em excesso | Operador: **interruptor global** em `/operador` (vale para todas as instalações). Para uma só: o escritório pausa a instalação | Ver `run_steps` e `outbound_messages`; corrigir; publicar nova versão; avisar os escritórios afetados |
| Consumo anormal | Interruptor global ou pausa; conferir `usage_events` por instalação | Ajustar estimativas e limites; revisar se o orçamento segurou (`budget_periods`) |
| Suspeita de vazamento entre organizações | Interruptor global; preservar logs; não apagar dados | Investigar consultas sem `org_id`; avaliar notificação legal (LGPD) com o jurídico |
| Segredo exposto | Revogar ou rotacionar **na origem** primeiro; depois remover do código | O segredo continua no histórico do Git: tratar como comprometido |
| Webhooks falhando | Ver respostas 401/400 em `/api/webhooks/testpay` (assinatura ou formato) | Reprocessar pelo provedor; a idempotência evita duplicidade |
| Execução presa em `running` | (MVP) marcar `failed` manualmente com registro de auditoria | (futuro) reaper automático por heartbeat |

## Rollback

- **Aplicação** (futuro, Vercel): promover a implantação anterior ("Instant Rollback").
- **Banco:** reverter o código **não** reverte o banco. Toda migração precisa de um par de reversão ou de um plano de recuperação documentado. Migração destrutiva só com backup verificado e restauração testada em ambiente isolado.
- **Versões de agente:** instalações ficam presas à versão. Publicar uma versão corrigida e orientar a atualização; versões antigas não são editáveis.

## Rotação de chaves

- `CREDENTIALS_ENCRYPTION_KEY` (futuro): adicionar a nova chave com outro `CREDENTIALS_KEY_ID`, recifrar as conexões em lote, retirar a antiga. O campo `connections.key_id` existe para isso; o processo de recifragem **não está implementado**.
- `TESTPAY_WEBHOOK_SECRET` / segredo do provedor real: trocar no provedor e no ambiente ao mesmo tempo.

## Backups (futuro)

Usar backups diários e PITR do banco gerenciado (ex.: Supabase Pro tem 7 dias de backup e PITR pago [S26]). Testar uma restauração por trimestre em projeto isolado e registrar o resultado aqui.
