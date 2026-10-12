# Premissas, riscos e pendências

Estado real dos controles e das hipóteses. Um controle só aparece como "ativo" com evidência.

## Estado dos controles

| Controle | Exigido em | Estado | Evidência |
|---|---|---|---|
| Regras documentadas | CLAUDE.md | ativo | este repositório |
| `.gitignore` para `.env*`, chaves e `.data/` | §5 | ativo | `.gitignore` |
| Verificação simples de segredos | §5 | ativo (local) | `npm run secrets:scan`, SEC-06 |
| Verificação dedicada (gitleaks) e no histórico | §5 | pendente | — |
| Isolamento entre organizações (servidor + RLS) | §4 | ativo no MVP | ISO-01..08 |
| Autenticação de produção | §4 | **pendente** | só login de demonstração (D-006) |
| Cifra de credenciais com chave fora do banco | §4 | ativo | SEC-01, SEC-02 |
| Limites, orçamento, aprovação, pausa | §6 | ativo | RUN-*, BIL-* |
| Avaliação real da IA | §7 | **pendente** | [evaluations.md](technical/evaluations.md) |
| CI (lockfile, lint, tipos, testes, build, segredos, dependências) | §9 | escrito, **nunca executado no GitHub** | `.github/workflows/ci.yml` |
| Produção bloqueada até os checks passarem | §9 | **não ativo** | exige proteção de branch + projeto Vercel |
| Prévias protegidas | §9 | **não ativo** | projeto Vercel inexistente |
| Monitoramento, backups e restauração testada | §11 | **pendente** | [launch-requirements.md](operations/launch-requirements.md) |

## Riscos

| ID | Risco | Impacto | Mitigação atual | Estado |
|---|---|---|---|---|
| R-01 | Vazamento entre organizações | Crítico | Servidor + RLS + testes com o papel da aplicação | mitigado no MVP; revalidar com Postgres real e autenticação real |
| R-02 | Injeção de instruções levando a ações indevidas | Crítico | Orquestração determinística; lista fechada de ferramentas; conteúdo só para classificar | mitigado com IA simulada; **avaliação real pendente** |
| R-03 | Gasto descontrolado (concorrência, loops) | Alto | Reserva atômica, CHECK, limites por execução, retentativas limitadas | mitigado; falta rate limit e reaper |
| R-04 | Mensagem ou cobrança duplicada | Alto | Saída persistida com chave única, consulta antes de repetir, eventos idempotentes | mitigado |
| R-05 | Segredo exposto | Alto | `.gitignore`, verificação local, redação de logs | parcial (falta gitleaks na CI) |
| R-06 | Execução presa em `running` após queda | Médio | Nenhuma automática | **aberto** (reaper no roadmap) |
| R-07 | Concorrência não testada em Postgres real | Médio | Lógica atômica em SQL | **aberto** |
| R-08 | Incumbente (Thomson Reuters, Acessórias) lança função equivalente | Alto (negócio) | Foco em resultado e controles; critérios de abandono | **aberto** |
| R-09 | Disposição a pagar abaixo do custo de servir (suporte) | Alto (negócio) | Implantação paga, limites por plano; sensibilidade modelada | **aberto**, validar no piloto |
| R-10 | LGPD, sigilo contábil, termos, tributação de repasse | Alto (legal) | Nenhum cliente real; dados fictícios | **aberto**, exige profissional |
| R-11 | Interface sem teste automatizado | Médio | Verificação manual | **aberto** |
| R-12 | Execução síncrona na requisição não escala | Médio | Uso só em demo | **aberto** (fila no roadmap) |

## Premissas principais (não validadas)

- Escritórios gastam horas relevantes por mês cobrando documentos ([icp-and-positioning.md](business/icp-and-positioning.md)).
- Preço de R$ 690–1.490/mês é aceitável para o ICP ([pricing.md](business/pricing.md)).
- Suporte de cerca de 2 h/mês por escritório depois do onboarding ([unit-economics.md](business/unit-economics.md)).
- Os clientes dos escritórios respondem a lembretes automáticos tão bem quanto aos manuais.
- Criadores parceiros trazem os próprios compradores.

## Pendências

- Escolher e implementar autenticação, banco gerenciado, e-mail real e fila (roadmap, fase 2).
- Enviar a CI ao GitHub e ativar a proteção de branch (exige admin do repositório).
- Criar o projeto na Vercel com Deployment Protection (exige conta autorizada).
- Retenção e exclusão de dados; exportação para o cliente.
- Rate limit por usuário e por IP; proteção de custo no construtor com IA real.
- Recifragem de credenciais na rotação de chave.
- Testes automatizados de interface (ex.: Playwright).
