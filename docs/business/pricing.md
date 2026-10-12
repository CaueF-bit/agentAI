# Preço (hipótese)

**Preço e permissões são sempre calculados no servidor** (regra do `CLAUDE.md` §8). Os planos abaixo existem como dados de teste no banco da demonstração, e o frontend não consegue alterá-los.

**Nada aqui é preço validado.** A disposição a pagar ainda não foi testada ([pilot-plan.md](../validation/pilot-plan.md)).

## Princípios

1. **Ancorar no valor, não em tokens.** O custo de IA por escritório fica entre R$ 19 e 73/mês ([unit-economics.md](unit-economics.md)). O cliente paga pelo fechamento no prazo e pelas horas poupadas.
2. **Cobrar de um lado só no início.** Quem paga é o comprador (o escritório). Criadores parceiros **não pagam assinatura** no lançamento; recebem repasse. Cobrar dos dois lados cedo demais aumenta o atrito sem haver demanda que o justifique.
3. **Previsibilidade.** Franquia generosa por número de empresas-cliente. Limite mensal de gasto configurável, que bloqueia novas execuções em vez de gerar fatura surpresa.
4. **Suporte é o maior custo variável.** A sensibilidade em `finance/output/report.md` mostra que o suporte pesa mais que a IA. Por isso a implantação é paga e os planos limitam o volume.

## Estrutura proposta (BRL)

| Componente | Essencial | Profissional | Empresarial |
|---|---|---|---|
| Mensalidade do escritório | **R$ 690** | **R$ 1.490** | sob consulta (a partir de R$ 3.500) |
| Empresas-cliente incluídas | até 80 | até 250 | acima de 250 |
| Agentes do catálogo | 1 (Fechamento Mensal) | até 3 | ilimitados |
| Excedente por empresa-cliente | R$ 6/mês | R$ 4/mês | negociado |
| Aprovação humana de mensagens | sim | sim, com regras por cliente | sim, com SSO e trilha exportável |
| Implantação acompanhada (uma vez) | R$ 2.500 (opcional) | R$ 2.500 (incluída na adesão anual) | projeto |
| Suporte | e-mail, 2 dias úteis | prioritário, 1 dia útil | dedicado |

O ARPA do cenário base do modelo é R$ 990: uma mistura de Essencial e Profissional.

### Valor econômico (hipótese ilustrativa, a medir)

| Item | Valor |
|---|---|
| Escritório | 80 empresas-cliente |
| Tempo de cobrança e conferência hoje | 1 h por cliente/mês |
| Custo-hora de assistente com encargos | R$ 40 |
| Custo do processo atual | ~R$ 3.200/mês |
| Economia se o agente reduzir 50% do tempo | R$ 1.600/mês |
| Preço do plano Essencial | R$ 690 (~43% do valor criado) |

**O cliente precisa reconhecer esse valor. Por isso o piloto mede horas reais.**

### Comparação com concorrentes (ordem de grandeza)

| Concorrente | Preço | Observação |
|---|---|---|
| Relevance AI Team [S19] | US$ 234–349/mês, ≈ R$ 1,2 a 1,7 mil (conversão ilustrativa) | Sem especialização no nicho, sem implantação |
| n8n Pro [S20] | €50/mês | Exige quem construa e mantenha |
| Salesforce Agentforce [S21] | US$ 0,10 por ação | Inviável para o porte do ICP |
| Gestores contábeis (Acessórias, Gestta) | Sem preço público | Comparação direta depende das entrevistas |

## Comissão e repasse

- **Agente da casa:** 100% da mensalidade é receita da plataforma.
- **Agente de criador parceiro no catálogo:** o criador recebe **70%** da mensalidade atribuível ao agente, e a plataforma retém 30%, que paga infraestrutura, cobrança, suporte de primeiro nível e conformidade.
  - Quem presta suporte: a plataforma faz o primeiro nível (acesso, cobrança, incidentes); o criador faz o segundo nível (lógica do agente).
  - **Receita da plataforma = parcela retida, não o volume total transacionado.** O modelo financeiro separa faturado, repasse e retido.
- **Modelo "infraestrutura" (estilo Shopify), mais tarde:** o criador assina um plano para operar agentes para os próprios clientes, com marca própria (hipótese: R$ 490/mês + uso), sem comissão sobre clientes que ele mesmo trouxe. Fica fora do MVP ([roadmap.md](../roadmap.md)).
- **Distribuição real de dinheiro a criadores: fora desta etapa.** Exige provedor de split de pagamento, notas fiscais e análise tributária e jurídica ([launch-requirements.md](../operations/launch-requirements.md)).

## Política de limites e gasto

- Cada instalação tem um **orçamento mensal de execução** (custo estimado de IA e canais) e um **limite de execuções simultâneas**. Os padrões são definidos pelo plano no servidor.
- **Ao atingir o limite:** novas execuções são bloqueadas e o escritório é avisado. Não há cobrança automática de excedente de consumo de IA no MVP.
- Aumentar o limite exige ação de um administrador do escritório (humano). **O agente nunca altera os próprios limites.**

## Hipóteses separadas em USD (sem validação)

Para um eventual teste internacional, as hipóteses de preço seriam construídas **localmente**, nunca por conversão:

- **Referência:** concorrentes generalistas cobram US$ 234–349/mês [S19] e a ferramenta não traz conhecimento do nicho.
- **Hipótese inicial a testar fora do Brasil:** US$ 249 / US$ 549 por mês para pequenas firmas de contabilidade. Exigiria refazer a lista de documentos, os canais e a conformidade do país.
- **Esse número não deriva do preço em reais e não está validado.**

## Testes de preço planejados

Ver [pilot-plan.md](../validation/pilot-plan.md):

- proposta de piloto pago em duas faixas (R$ 690 × R$ 1.490);
- implantação cobrada e implantação gratuita com adesão anual;
- medir aceitação real (proposta assinada), não intenção declarada.
