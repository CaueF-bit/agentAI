# Roadmap

Ordem condicionada às decisões do [pilot-plan.md](validation/pilot-plan.md). As datas são metas, não compromissos.

| Fase | Quando (meta) | Entregas | Porta de saída |
|---|---|---|---|
| **0. MVP de demonstração** | concluído em 2026-10 | Esta fatia funcional, documentação, 68 testes | Revisão do responsável |
| **1. Descoberta** | nov/2026 | Entrevistas; ajuste do fluxo e dos preços | Critérios da fase 1 do plano |
| **2. Fundação para piloto** | nov–dez/2026 | Autenticação consolidada; Postgres gerenciado + adaptador `pg` e teste de concorrência real; migrações versionadas; fila durável + reaper; e-mail real limitado; monitoramento; CI rodando; proteções no GitHub e na Vercel; avaliação real da IA; análise jurídica e de LGPD | Bloqueios de [launch-requirements.md](operations/launch-requirements.md) resolvidos para o escopo do piloto |
| **3. Piloto pago** | jan–mar/2027 | 3–5 escritórios; leitura de PDF/XML de NF-e; agendamento mensal; importação de clientes | Metas do piloto |
| **4. Catálogo curado com criadores** | abr–jun/2027 | 1–3 criadores parceiros; repasse via provedor de split (após análise tributária); WhatsApp oficial | Receita recorrente e suporte ≤ 2 h por escritório |
| **5. Infraestrutura para criadores ("Shopify")** | 2º sem/2027 | Plano do criador, marca própria, clientes do criador | Criadores validados |
| **6. Marketplace aberto e novos fluxos e nichos** | 2028+ | Avaliações públicas, revisão de qualidade por IA + humano, novos nichos | Dados de demanda recorrente |

## Fora do horizonte atual

- Expansão internacional: exige refazer documentos, canais e conformidade por país.
- Treinar modelo próprio: não é necessário.
- Execução de código gerado: só com isolamento (sandbox) e necessidade demonstrada.
