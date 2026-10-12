# Economia do negócio (unit economics)

**Fonte dos números:** `finance/model.mjs` + `finance/assumptions.json`. O resultado completo fica em `finance/output/report.md` e a sensibilidade em `finance/output/sensitivity.csv`. Recalcule com:

```bash
npm run finance
```

Os valores abaixo são da execução de 2026-10-11. **Tudo é hipótese**, exceto os preços de fornecedores citados.

## Componentes de custo modelados (por escritório/mês)

| Componente | Como é calculado | Base de preço |
|---|---|---|
| Modelos de IA | Documentos classificados e lembretes redigidos × tokens × preço, mais uso do construtor e do teste em sandbox, × (1 + sobrecarga de retentativas) | Anthropic [S22]: Opus 5.5 US$ 4 / 20 por milhão de tokens; Sonnet 5.5 US$ 2 / 10; Haiku 4.5 US$ 1 / 5 |
| Canais | Lembretes × (fração WhatsApp × tarifa por template + e-mail × custo por e-mail) | **Tarifa de WhatsApp é placeholder**: estrutura de cobrança conhecida, valor do Brasil não obtido [S24] |
| Infraestrutura variável | Valor fixo por escritório: armazenamento, fila, execução | hipótese |
| Suporte e onboarding recorrente | Horas por mês × custo-hora | hipótese |
| Taxa de pagamento | 3,99% + R$ 0,39 por cobrança em cartão | Stripe [S23] |
| Impostos sobre receita | 10% da receita retida | **hipótese a validar com contador** |
| Repasse a criadores | 30% da receita vem de agentes de parceiros, dos quais 70% são repassados | [pricing.md](pricing.md) |

**Volumes base (hipótese):** 80 empresas-cliente × 12 documentos × 2,5 lembretes por mês. Tokens por classificação: 1.500 de entrada e 150 de saída. Por redação de lembrete: 1.200 de entrada e 300 de saída.

## Resultado por escritório (mensal)

| Cenário | Faturado | Repasse | **Receita retida** | Pagamento | Impostos | IA | Canais | Infra | Suporte | **Margem de contribuição** |
|---|---|---|---|---|---|---|---|---|---|---|
| Conservador | R$ 690 | R$ 145 | R$ 545 | R$ 28 | R$ 55 | R$ 73 | R$ 7 | R$ 25 | R$ 270 | **R$ 88 (16%)** |
| Base | R$ 990 | R$ 208 | R$ 782 | R$ 40 | R$ 78 | R$ 64 | R$ 5 | R$ 15 | R$ 180 | **R$ 399 (51%)** |
| Otimista | R$ 1.290 | R$ 271 | R$ 1.019 | R$ 52 | R$ 102 | R$ 19 | R$ 3 | R$ 10 | R$ 90 | **R$ 743 (73%)** |

- **Faturado** é o que o cliente paga. **Receita retida** é o faturado menos o repasse a criadores. A margem é calculada sobre a receita retida.
- **O cenário otimista usa modelos menores** (Haiku 4.5 e Sonnet 5.5). Roteamento de modelos é **otimização futura**: só vale depois de uma avaliação mostrar qualidade equivalente ([evaluations.md](../technical/evaluations.md)). Não é garantia de margem. Modelos abertos hospedados também têm custo (GPU, operação), e o modelo financeiro não os considera.

## Sensibilidade (preço base de R$ 990)

Margem de contribuição por escritório/mês:

| Consumo \ Suporte (h/mês) | 0,5 | 1 | 2 | 4 | 6 |
|---|---|---|---|---|---|
| 0,5× | R$ 568 | R$ 523 | R$ 433 | R$ 253 | R$ 73 |
| 1× | R$ 534 | R$ 489 | R$ 399 | R$ 219 | R$ 39 |
| 2× | R$ 467 | R$ 422 | R$ 332 | R$ 152 | −R$ 28 |
| 4× | R$ 333 | R$ 288 | R$ 198 | R$ 18 | −R$ 162 |

**Conclusões:**

1. **Suporte manda na margem.** Passar de 2 h para 6 h por mês destrói a margem. O produto precisa reduzir suporte: implantação guiada, lista de documentos pronta e mensagens de erro claras.
2. Quadruplicar o consumo de IA reduz a margem, mas não a elimina com suporte baixo.
3. O limite de orçamento por instalação protege contra o pior caso de consumo (um loop ou um cliente com volume anômalo).

## Custos fixos, ponto de equilíbrio e CAC

| Item mensal | Valor | Tipo |
|---|---|---|
| Hospedagem e banco | R$ 600 | Vercel Pro [S25] + Supabase Pro [S26] + computação e backups, arredondado |
| Monitoramento e ferramentas | R$ 500 | hipótese |
| Equipe mínima (2 fundadores) | R$ 15.000 | hipótese |
| Contador, jurídico e LGPD (rateado) | R$ 1.500 | hipótese |
| **Total** | **R$ 17.600** | |

| Cenário | Clientes para equilíbrio | CAC (hipótese) | Prazo de recuperação do CAC |
|---|---|---|---|
| Conservador | 201 | R$ 4.000 | 45,5 meses (**inviável**) |
| Base | 45 | R$ 2.500 | 6,3 meses |
| Otimista | 24 | R$ 1.500 | 2 meses |

- **LTV não é calculado:** não há histórico de retenção.
- O CAC é hipótese: tempo dos fundadores mais eventos e parcerias por cliente fechado.

## Custos estimados do piloto

| Item | Estimativa | Observação |
|---|---|---|
| IA durante o piloto (5 escritórios, 3 meses) | ≈ R$ 1.000 | 5 × R$ 64 × 3, com folga |
| WhatsApp | Depende do rate card | Começar por e-mail e upload reduz o custo e o risco |
| Infraestrutura | ≈ R$ 600/mês | Planos pagos só ao atender clientes reais |
| Tempo de implantação | 8–12 h por escritório | O principal custo do piloto |
| Análise jurídica e LGPD antes do piloto | sob orçamento | Obrigatória ([launch-requirements.md](../operations/launch-requirements.md)) |

**Nenhum desses gastos está autorizado. Todos dependem de aprovação do responsável.**
