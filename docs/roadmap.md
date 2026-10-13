# Roadmap

Construído por fases, cada uma com um **"pronto quando"** (CLAUDE.md §13). A parte mais arriscada vem primeiro. Ao fim de cada fase: parar, mostrar, ensinar a testar e esperar o responsável. Datas são metas, não compromissos.

| Fase | Pronto quando | Situação |
|---|---|---|
| **0. Fundação de demonstração** | O fluxo completo (criar → contratar → executar → aprovar) roda localmente com dados fictícios, e os testes passam | ✅ concluída (2026-10-11): 71 testes |
| **0b. Prévia na nuvem** | A prévia protegida da Vercel abre, o `/api/health` mostra `ok: true` e o roteiro Bruno → Ana funciona lá | ✅ concluída (2026-10-13): `/api/health` com `ok: true` (Postgres/Neon) e roteiro Bruno → Ana aprovado pelo responsável na prévia |
| **1. Prova da peça arriscada (IA real)** | O Claude real classifica ~30 documentos fictícios **realistas**, incluindo PDF, foto de celular e XML de nota, com acerto ≥ 90%, sem nenhuma ação causada por documento malicioso, e o custo por documento fica medido. **Se não passar, parar e repensar o fluxo antes de qualquer tela nova** | ⏳ espera a chave da Anthropic (gasto estimado: centavos) |
| **1b. Prova da peça arriscada (negócio)** | 15 entrevistas feitas com o roteiro de [customer-interviews.md](validation/customer-interviews.md); ≥ 40% citam a cobrança de documentos entre as 3 maiores dores | ⏳ pode correr em paralelo à fase 1 |
| **2. Documentos de verdade entram no app** | O escritório envia PDF, imagem ou XML e o agente classifica sem ninguém digitar texto (hoje o app só aceita texto) | ⏳ |
| **3. Fundação para piloto** | Login real, banco de produção com backup, e-mail real limitado, monitoramento, proteção da branch `main` e análise jurídica e de LGPD feita | ⏳ |
| **4. Piloto pago** | 3 a 5 escritórios usando por 3 meses, com as metas de [pilot-plan.md](validation/pilot-plan.md) medidas | ⏳ |
| **5. Catálogo com criadores parceiros** | 1 a 3 criadores publicam agentes e recebem repasse por provedor de pagamento real (após análise tributária) | ⏳ |
| **6. Infraestrutura para criadores ("Shopify")** | Um criador opera agentes para os próprios clientes com a marca dele | ⏳ |
| **7. Marketplace aberto e novos nichos** | Demanda recorrente medida justifica abrir o catálogo e entrar em outro nicho | ⏳ |

## Fora do horizonte atual

- Expansão internacional: exige refazer documentos, canais e conformidade por país.
- Treinar modelo próprio: não é necessário.
- Execução de código gerado: só com isolamento (sandbox) e necessidade demonstrada.
