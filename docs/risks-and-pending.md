# Riscos e pendências

Estado real dos controles. Um controle só aparece como "ativo" com evidência (teste executado, configuração verificada, link ou comando).

## Estado dos controles

| Controle | Exigido em | Estado | Evidência |
|---|---|---|---|
| Regras documentadas | CLAUDE.md | ativo | este repositório |
| `.gitignore` bloqueando `.env` e afins | §5 | ativo | `.gitignore` |
| Verificação de segredos antes de commit | §5 | pendente | — |
| CI (lockfile, lint, tipos, testes, build, segredos, dependências) | §9 | pendente | — |
| Produção bloqueada até checks obrigatórios passarem | §9 | pendente | — |
| Proteção de branch no GitHub | §9 | pendente | — |
| Prévias da Vercel protegidas | §9 | pendente | — |
| Ambientes dev / prévia / produção separados | §9 | pendente | — |
| Isolamento entre organizações (servidor + banco) | §4 | pendente | — |
| Monitoramento, backups e restauração testada | §11 | pendente | — |

## Riscos conhecidos

| ID | Risco | Impacto | Mitigação planejada | Estado |
|---|---|---|---|---|
| R-01 | Vazamento de dados entre organizações | Crítico | Autorização no servidor + RLS + testes OBR-02/03 | aberto |
| R-02 | Prompt injection levando agente a ações não autorizadas | Crítico | Allowlist de ferramentas fora do modelo, separação instrução/conteúdo, OBR-08/09 | aberto |
| R-03 | Gasto descontrolado com IA (concorrência, loops de retentativa) | Alto | Orçamento atômico, limites de passos/tempo, OBR-10/11 | aberto |
| R-04 | Cobrança duplicada | Alto | Idempotência, webhooks verificados, OBR-12/16 | aberto |
| R-05 | Segredo exposto no Git ou no frontend | Alto | Scanner de segredos local e na CI | aberto |

## Pendências

- Receber a especificação do produto e definir o escopo do MVP.
- Escolher a stack e registrar em `docs/decisions.md`.
- Configurar CI e proteções de publicação (exige acesso de administrador ao GitHub e à Vercel).
