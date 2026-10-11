# Checklist de publicação e relatório de entrega

Uso operacional de `CLAUDE.md` §10 e §12. Copiar a seção "Relatório" para cada pedido de publicação.

## Bloqueios de produção (todos precisam estar resolvidos)

- [ ] Nenhum teste obrigatório falhando ou sem execução.
- [ ] Pelo menos 50 cenários relevantes aprovados (primeira versão).
- [ ] Nenhuma falha conhecida de isolamento, autenticação ou autorização.
- [ ] Nenhum segredo exposto (verificação executada no código e no histórico).
- [ ] Nenhuma vulnerabilidade crítica/alta aplicável sem correção ou mitigação revisada.
- [ ] Nenhum risco conhecido de cobrança duplicada ou gasto sem controle.
- [ ] Nenhuma integração simulada apresentada como real.
- [ ] Avaliações reais feitas para as funcionalidades de IA essenciais.
- [ ] Nenhuma migração destrutiva sem plano de recuperação.
- [ ] Autorização explícita do responsável para publicar.

## Antes de atender clientes reais

- [ ] Monitoramento de erros, falhas de tarefas e consumo anormal.
- [ ] Dados sensíveis mascarados nos logs.
- [ ] Auditoria de ações administrativas.
- [ ] Backup configurado e restauração testada em ambiente isolado.
- [ ] Rollback de aplicação e de migrações documentado.
- [ ] Mecanismo para interromper execuções de agentes.
- [ ] Verificações pós-publicação e procedimento de resposta a falhas.

## Relatório

1. **Revisão/commit verificado:**
2. **Funcionalidades implementadas:**
3. **Cenários:** aprovados __ / falhos __ / ignorados __
4. **Comandos executados e resultados reais:**
5. **Evidências de integração e jornadas completas:**
6. **Avaliações reais da IA e limitações:**
7. **Verificações de segurança e pendências:**
8. **Integrações reais × simuladas:**
9. **Estado das proteções de publicação (GitHub, Vercel, CLI, promoção de prévia):**
10. **Plano de recuperação e riscos restantes:**
