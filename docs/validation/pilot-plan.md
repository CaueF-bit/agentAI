# Plano de validação e piloto

Hipótese a testar: escritórios contábeis pagam um preço premium por um agente que reduz o tempo de cobrança e conferência de documentos do fechamento ([niche-selection.md](../research/niche-selection.md)).

## Fases e critérios de decisão

| Fase | Duração | Atividade | Continuar se… | Mudar ou parar se… |
|---|---|---|---|---|
| 1. Descoberta | 4 semanas | 15–20 entrevistas de compradores + 5–8 de criadores ([customer-interviews.md](customer-interviews.md)) | ≥ 40% citam cobrança e conferência de documentos entre as 3 maiores dores **e** ≥ 5 escritórios aceitam conversar sobre piloto | < 40%, ou a maioria diz que o portal atual resolve → reavaliar o nicho (critérios de abandono) |
| 2. Proposta de piloto pago | 2 semanas | Proposta escrita a 8–10 escritórios | ≥ 3 propostas **assinadas** | < 2 assinadas mesmo com desconto → preço ou proposta errados |
| 3. Piloto | 12 semanas | 3–5 escritórios, implantação acompanhada; canal e-mail/upload primeiro | Metas abaixo atingidas em ≥ 2 escritórios | Metas não atingidas após 2 ciclos de ajuste |
| 4. Decisão | 1 semana | Revisão com dados | Ver "Decisão final" | — |

**Pré-requisitos do piloto (bloqueantes):**
- análise jurídica e de LGPD;
- autenticação real;
- banco gerenciado com backup;
- envio real de e-mail limitado;
- avaliação real de classificação ([evaluations.md](../technical/evaluations.md));
- monitoramento ([launch-requirements.md](../operations/launch-requirements.md)).

## Proposta de piloto pago (hipótese)

- **3 meses, R$ 990/mês com implantação incluída** (Essencial de R$ 690 + implantação diluída nas mensalidades) **ou** R$ 690/mês + R$ 2.500 de implantação à vista. Duas variantes para testar o preço.
- Escopo: até 80 empresas-cliente, um agente de fechamento, aprovação sempre ligada no primeiro mês.
- Compromisso do escritório: registrar horas de cobrança no mês anterior (base) e durante o piloto.
- Saída: relatório de resultados. Pode cancelar no fim de cada mês.

## Testes de preço

- Variar a faixa entre escritórios semelhantes: R$ 690, R$ 990 e R$ 1.490.
- Medir **aceitação real**: proposta assinada ou primeira fatura paga. Disposição declarada não conta.
- Testar implantação paga contra implantação embutida na adesão anual.

## Canais para os primeiros clientes

Ver [go-to-market.md](../business/go-to-market.md): rede pessoal, consultores parceiros, Sescon e CRC, conteúdo sobre reforma tributária e fechamento.

**Criadores trazendo compradores:** recrutar 1 ou 2 consultores que já atendem escritórios para codesenhar o agente e indicar 2 escritórios cada, com repasse de 70%.

## Métricas e metas do piloto

| Métrica | Meta para continuar |
|---|---|
| Ativação (1ª competência completa em 30 dias) | ≥ 80% dos pilotos |
| Clientes com documentação completa até o dia D | +20 p.p. sobre a base medida |
| Tempo manual de cobrança e conferência | −50% sobre a base |
| Erro de classificação (correções do usuário) | ≤ 5% |
| Lembretes rejeitados na aprovação | ≤ 15% após o 1º mês |
| Horas de suporte por escritório/mês | ≤ 2 h a partir do 2º mês |
| Custo de IA e canal por escritório/mês | ≤ R$ 100 |
| Renovação após o piloto | ≥ 60% |

## Decisão final

- **Continuar e ampliar:** metas atingidas e ≥ 60% de renovação.
- **Mudar o fluxo dentro do nicho:** dor confirmada, mas o fluxo não gera o resultado esperado. Exemplo: passar para atendimento de dúvidas repetitivas ou obrigações acessórias.
- **Mudar de nicho:** dor não confirmada ou preço inviável. Próximo candidato: imobiliárias, com recorte em administração de locação.
- **Interromper:** nenhum nicho mostra disposição a pagar acima do custo de servir (ver sensibilidade em [unit-economics.md](../business/unit-economics.md)).

## Validação do lado do criador (separada)

- **Continuar** com criadores se ≥ 2 consultores aceitarem codesenhar e indicar escritórios com repasse.
- Se nenhum aceitar, operar só com agentes da casa e adiar o marketplace (não é fatal para o negócio de compradores).
