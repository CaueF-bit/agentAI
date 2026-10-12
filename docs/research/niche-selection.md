# Seleção de nicho

> **Status:** hipótese provisória para documentação e demonstração. **Não é validação comercial.** A decisão está registrada em [decisions.md](../decisions.md) (D-002).

## Candidatos

SMS é um canal, não um nicho, por isso ficou fora. Comparamos seis nichos, cada um com um fluxo de alto valor:

| # | Nicho | Fluxo candidato |
|---|---|---|
| A | Organizações contábeis | Fechamento mensal: cobrar, receber, conferir e organizar documentos dos clientes |
| B | Imobiliárias | Atendimento e qualificação de leads, agendamento de visitas |
| C | Clínicas odontológicas | Agendamento, confirmação e redução de faltas |
| D | Corretoras de seguros | Renovações e coleta de dados para cotação |
| E | Escritórios de advocacia | Triagem de intimações/prazos e atendimento inicial |
| F | Oficinas mecânicas | Orçamento, aprovação e acompanhamento do cliente |

## Evidências por nicho

Separadas do julgamento: aqui só fatos com fonte.

- **A — Contábil:**
  - 97.836 organizações [S11].
  - 78% dos profissionais usam IA toda semana; retrabalho manual é a dor nº 1 (34%) [S14].
  - Ciclo mensal de obrigações; reforma tributária em transição até 2033 [S35].
  - Incumbentes de gestão e portal: Thomson Reuters/Gestta, Acessórias, Qive [S17, S18, S37].
  - Alegação sem metodologia de que 80% das mensagens são repetitivas [S15].
- **B — Imobiliárias:**
  - ~650 mil corretores pessoa física; número de imobiliárias não encontrado [S30].
  - Lais (Lastro): Série A de R$ 85 mi, cerca de mil imobiliárias atendidas, 9 das 10 maiores [S28].
  - Adoção de IA estimada em 19% [S29], confiança baixa.
- **C — Odontologia:**
  - Mais de 52 mil clínicas e mais de 400 mil dentistas [S31], confiança baixa.
  - Vários chatbots de agendamento já no mercado [S32].
  - Dados de saúde são categoria sensível na LGPD.
- **D — Seguros:**
  - 64.794 corretoras PJ ativas [S27].
  - Segura captou R$ 45 mi para IA no WhatsApp dos corretores [S33].
  - Segfy (multicálculo) pertence à Porto.
- **E — Advocacia:**
  - Jusbrasil (Jus IA), Astrea e muitas legaltechs [S34].
  - Perder um prazo tem consequência grave; sigilo profissional.
- **F — Oficinas:**
  - Não encontramos fonte primária de quantidade nem de adoção de software. **Lacuna.**

## Matriz de decisão

Notas de 1 a 5, sempre "5 = melhor para nós":

- **Integrações:** 5 = fácil.
- **Personalização:** 5 = pouca personalização necessária.
- **Concorrência:** 5 = pouca concorrência.
- **Ciclo de venda:** 5 = curto.
- **Riscos:** 5 = risco baixo.

As notas são **julgamento da equipe** apoiado nas evidências acima. **Não são medidas científicas.** Pesos somam 100.

| Critério | Peso | A Contábil | B Imob. | C Odonto | D Seguros | E Advocacia | F Oficinas |
|---|---|---|---|---|---|---|---|
| Intensidade e frequência da dor | 14 | 4 | 4 | 4 | 4 | 4 | 3 |
| Disposição e capacidade de pagamento | 12 | 3 | 3 | 3 | 3 | 4 | 2 |
| Facilidade de acessar compradores | 10 | 4 | 3 | 3 | 3 | 3 | 2 |
| Repetibilidade entre empresas | 12 | 5 | 4 | 4 | 4 | 3 | 4 |
| Integrações (disponibilidade/dificuldade) | 8 | 3 | 3 | 2 | 2 | 2 | 2 |
| Pouca personalização/suporte | 7 | 3 | 3 | 3 | 3 | 2 | 3 |
| Concorrência | 8 | 3 | 2 | 2 | 2 | 2 | 4 |
| Ciclo de venda | 6 | 4 | 4 | 4 | 4 | 3 | 4 |
| Riscos de dados e erros | 7 | 3 | 4 | 2 | 3 | 1 | 4 |
| Possibilidade de comprovar retorno | 10 | 4 | 4 | 4 | 4 | 3 | 3 |
| Adequação a fundador com dev assistido por IA | 6 | 4 | 4 | 3 | 3 | 2 | 3 |
| **Pontuação ponderada (de 5)** | 100 | **3,70** | 3,47 | 3,19 | 3,26 | 2,83 | 3,03 |

**Sensibilidade:**

- Se a concorrência no nicho contábil for pior do que julgamos (nota 2 em vez de 3), A cai para 3,62 e continua em primeiro.
- Se imobiliárias tiverem disposição de pagar 5, B sobe para 3,71 e passa A. **Esse é o principal ponto a validar.**

Racional das notas de A:

- **Repetibilidade máxima:** todo mês, todo escritório coleta os mesmos tipos de documento (extratos, notas, folha) de dezenas de clientes.
- **Retorno mensurável:** horas de cobrança, percentual de clientes com documentação completa até o dia X, atrasos de obrigações.
- **Acesso facilitado:** comunidade concentrada em CRCs, Sescons, eventos e grupos.
- **Integrações rasas o suficiente para o MVP:** e-mail, upload e WhatsApp. Não exige integrar o ERP contábil.

## Recomendação

**Nicho: organizações contábeis (escritórios de contabilidade) no Brasil.**
**Fluxo inicial: "Agente de Fechamento Mensal".** A cada competência (mês de referência), o agente:

1. Gera, para cada empresa-cliente, a lista de documentos esperados conforme regime e perfil.
2. Recebe e classifica os documentos enviados.
3. Confere pendências contra a lista.
4. Redige e, conforme a política de aprovação, envia lembretes escalonados.
5. Entrega ao contador um painel de status com exceções.

O agente **não** transmite obrigações ao fisco, não altera escrituração e não toma decisão tributária. Isso mantém o risco de erro limitado e o humano no controle.

**Por que esse fluxo:**

- Alta frequência (mensal) e volume (dezenas de clientes por escritório).
- Hoje é resolvido com e-mail, WhatsApp manual e planilha (hipótese a validar).
- Integrações simples.
- Valor fácil de medir.

### Lado da criação

Quem cria agentes neste nicho:

- Consultores de processos contábeis.
- Software houses do setor.
- Escritórios maiores que padronizaram rotinas e querem vendê-las.

Validar compradores **não** valida esses criadores (ver [pilot-plan.md](../validation/pilot-plan.md)).

## O que nos faria abandonar a escolha

- **Dor já resolvida:** em 15 ou mais entrevistas com escritórios de 5+ pessoas, menos de 40% colocam a cobrança e conferência de documentos entre as 3 maiores dores, ou dizem que portais existentes (Acessórias, Gestta/Onvio) já resolvem bem.
- **Preço baixo demais:** a disposição a pagar declarada **e** testada (proposta de piloto pago) fica abaixo de R$ 300/mês para um escritório de cerca de 80 clientes.
- **Barreira de dados:** os escritórios não aceitam compartilhar documentos de clientes com um terceiro por sigilo, ou exigem integração profunda com o ERP já no primeiro dia.
- **Piloto fraco:** menos de 50% de redução do tempo manual de cobrança, ou mais de 5% de erro de classificação após ajuste.
- **Incumbente:** um incumbente lança função equivalente incluída no plano atual sem custo extra, e os entrevistados dizem que ela basta.

Se isso acontecer, o próximo candidato a reavaliar é **B (imobiliárias)**. Mas a concorrência bem financiada [S28] exigiria um recorte diferente, por exemplo administração de locação em vez de captação de leads.
