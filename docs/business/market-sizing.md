# TAM, SAM e SOM

**Fonte única dos números:** `finance/assumptions.json` (premissas editáveis) e `finance/model.mjs` (fórmulas). O resultado gerado fica em `finance/output/report.md`. Para recalcular:

```bash
npm run finance
```

Este documento explica as fórmulas e mostra o resultado da última execução, em 2026-10-11.

## Definições

| Sigla | O que mede aqui | Unidade |
|---|---|---|
| **TAM** | Gasto anual plausível de **todas** as organizações contábeis do Brasil com um agente de fechamento mensal | BRL/ano |
| **SAM** | Parte do TAM compatível com o nosso produto: escritórios com equipe (não individuais), processos digitais e canais suportados (e-mail, upload, WhatsApp) | BRL/ano |
| **SOM** | Receita recorrente anual (ARR) alcançável em 36 meses com **capacidade comercial limitada** (fundadores vendendo), descontado o churn | BRL/ano |

O cálculo é feito **de baixo para cima**, nunca como "1% do mercado". Faturamento de criadores e GMV **não entram**: só o valor de assinatura que o escritório pagaria.

## Fórmulas

```
firmas_multi = total_organizacoes × fração_com_equipe
firmas_solo  = total_organizacoes − firmas_multi
TAM = firmas_multi × gasto_anual_multi + firmas_solo × gasto_anual_solo
SAM = firmas_multi × fração_digital_pronta × gasto_anual_multi

Para cada mês m de 1 a 36:
  novos(m)    = demos_por_mês × min(1, m / meses_de_rampa) × taxa_de_conversão
  clientes(m) = clientes(m−1) × (1 − churn_mensal) + novos(m)

SOM = clientes(36) × ARPA_mensal × 12   (ARPA = receita média por cliente)
```

## Premissas principais

| Premissa | Conservador | Base | Otimista | Tipo |
|---|---|---|---|---|
| Total de organizações contábeis | 97.836 | 97.836 | 97.836 | observado [S11] |
| Fração com equipe (sociedades) | 33% | 33% | 33% | estimativa, confiança baixa [S13] |
| Fração digital pronta | 50% | 60% | 70% | hipótese |
| Gasto anual de escritório com equipe | R$ 6.000 | R$ 9.600 | R$ 14.400 | hipótese (≈ R$ 500 / 800 / 1.200 por mês) |
| Gasto anual de escritório individual | R$ 1.800 | R$ 2.400 | R$ 3.600 | hipótese |
| Demos por mês (capacidade dos fundadores) | 8 | 15 | 25 | hipótese |
| Conversão de demo em cliente | 15% | 20% | 25% | hipótese |
| Churn mensal | 3% | 2% | 1,5% | hipótese, sem histórico |
| ARPA mensal | R$ 690 | R$ 990 | R$ 1.290 | hipótese ([pricing.md](pricing.md)) |

**Justificativas:**

- **Demos:** 15 por mês é o que dois fundadores conseguem fazer junto com o desenvolvimento.
- **Conversão de 20%:** só é plausível com demo qualificada vinda de indicação de parceiro.
- **Churn de 2% ao mês:** equivale a cerca de 21% ao ano, típico de SaaS para PMEs. **Não há dado nosso.**

## Resultado (execução de 2026-10-11)

| Cenário | TAM | SAM | Escritórios no SAM | Clientes no mês 36 | SOM (ARR no mês 36) |
|---|---|---|---|---|---|
| Conservador | R$ 312 mi (≈ US$ 62 mi) | R$ 97 mi | 16,1 mil | 26 | R$ 0,21 mi |
| Base | R$ 467 mi (≈ US$ 94 mi) | R$ 186 mi | 19,4 mil | 75 | R$ 0,89 mi |
| Otimista | R$ 701 mi (≈ US$ 140 mi) | R$ 325 mi | 22,6 mil | 171 | R$ 2,65 mi |

Conversões em dólar usam a PTAX de 09/10/2026 [S01] e são só ilustrativas.

## Leitura

- **O SOM é pequeno perto do SAM, de propósito:** o limite é capacidade de venda e implantação, não tamanho de mercado. Aumentar o SOM depende de canais de parceiros e criadores que trazem clientes ([go-to-market.md](go-to-market.md)), não de "ganhar 1%".
- **Comparação com o ponto de equilíbrio:** no cenário base, o equilíbrio exige cerca de 45 clientes ([unit-economics.md](unit-economics.md)). O modelo chega lá por volta do mês 20. No conservador, não chega em 36 meses. **Esse é um risco real do plano.**
- **O que mais move o resultado:**
  1. gasto anual por escritório (só a disposição a pagar validada responde);
  2. conversão;
  3. churn.

## Expansão internacional

Fora do escopo do cálculo. O processo contábil é muito local: obrigações, documentos e canais mudam por país. Um TAM internacional exigiria reconstruir as premissas por país, não converter moeda.
