# ICP, problema e posicionamento

**Nicho (hipótese provisória):** organizações contábeis no Brasil. Fluxo inicial: Agente de Fechamento Mensal. Escolha justificada em [niche-selection.md](../research/niche-selection.md).

Tudo neste documento é **hipótese a validar** em entrevistas ([customer-interviews.md](../validation/customer-interviews.md)), salvo onde há fonte citada.

## ICP do comprador (lado prioritário)

| Item | Hipótese |
|---|---|
| Perfil | Escritório contábil com 5 a 40 pessoas e 50 a 400 empresas-cliente, a maioria no Simples Nacional e no Lucro Presumido |
| Operação | Fechamento mensal por competência; equipes de departamento fiscal, contábil e pessoal |
| Ferramentas | ERP contábil (Domínio/Onvio, Alterdata, Questor, SCI etc.), gestão de tarefas (Acessórias, Gestta), WhatsApp, e-mail, planilhas [S17, S18] |
| Orçamento provável | Já paga por ERP e gestão. Um agente de R$ 690 a R$ 1.490/mês competiria com 1/3 a 1/2 do salário de um assistente (**validar**) |
| Quem compra | Sócio-proprietário |
| Quem usa | Coordenadores e assistentes de departamento |
| Quem aprova | Sócio. Às vezes um gestor de operações nos escritórios maiores |

### Trabalho a realizar e situação atual

- **Trabalho que o cliente quer fazer:** "Fechar o mês de todos os clientes dentro do prazo, sem perseguir documento por documento."
- **Como resolve hoje (hipótese):** listas em planilha ou na ferramenta de tarefas, mensagens manuais no WhatsApp e e-mail, conferência visual dos arquivos recebidos e cobrança repetida.
- **Custos e consequências (hipóteses):**
  - horas de assistente gastas cobrando e conferindo documentos;
  - obrigações entregues em cima do prazo;
  - multas por atraso (que às vezes o escritório absorve);
  - retrabalho, que é a dor nº 1 citada [S14];
  - desgaste no relacionamento com o cliente;
  - dificuldade de crescer a carteira sem contratar.

### Gatilhos de compra e objeções

- **Gatilhos:** temporada de obrigações anuais, aumento de carteira, saída de um assistente, transição da reforma tributária [S35], multa recente.
- **Objeções esperadas:**
  1. "Meus clientes não respondem robô."
  2. "Sigilo: não posso mandar documentos de clientes para terceiros."
  3. "Já tenho portal (Acessórias/Onvio)."
  4. "IA erra."
  5. "Mais uma ferramenta para a equipe aprender."
  6. Preço.

**Resposta de produto às objeções:**

- Aprovação humana antes de enviar.
- Tom configurável e marca do escritório.
- O agente funciona ao lado do portal existente, sem substituí-lo.
- Isolamento de dados por escritório e por instalação.
- Painel de resultado.

### Por que um escritório cancelaria (hipóteses)

Tão importante quanto o motivo de entrada. Cada item tem a defesa que o produto precisa ter; ideia que piora algum destes pontos deve ser recusada, mesmo que pareça melhoria.

| Motivo provável de saída | O que o produto precisa garantir |
|---|---|
| Os clientes do escritório reclamam das mensagens (tom robótico, insistência) e o sócio fica constrangido | Tom configurável, limite de lembretes, aprovação humana ligada por padrão |
| O agente erra a classificação e a equipe volta a conferir tudo à mão: não economiza tempo | Medir o erro no piloto; mostrar a confiança; correção em um clique (**pendente**) |
| A implantação demora ou exige configuração demais | Lista de documentos pronta por regime; importação de clientes (**pendente**) |
| A equipe não adota "mais uma ferramenta" e volta ao WhatsApp manual | Painel simples, poucos cliques por competência |
| O custo fica imprevisível ou o retorno não aparece | Limite de gasto; resultado cliente a cliente no painel |
| Medo de sigilo ou LGPD depois de uma pergunta de cliente | Isolamento, trilha de auditoria, termos claros (análise jurídica **pendente**) |
| O ERP ou portal atual lança algo "bom o suficiente" incluído no plano | Foco no resultado medido do fechamento, não em recurso isolado |

### Quem NÃO atender no início

- Profissionais individuais com menos de 30 clientes: baixo potencial de retorno e muito suporte por real faturado.
- Grandes redes contábeis com TI própria: ciclo longo, exigências de segurança e integração.
- Escritórios focados em Lucro Real complexo ou indústria: documentação muito heterogênea.
- Quem quer que a IA "faça a contabilidade" ou transmita obrigações: fora do escopo e de alto risco.

## ICP do criador (lado secundário)

| Item | Hipótese |
|---|---|
| Perfil | Consultor de processos contábeis, software house do setor, escritório grande com rotina padronizada, agência de automação com clientes contábeis |
| Motivação | Monetizar conhecimento de processo sem manter infraestrutura nem cobrança |
| Traz demanda própria? | Consultores e agências **trazem os próprios clientes** (modelo "Shopify"). Escritórios que querem vender a pares **esperam compradores** do catálogo (modelo marketplace) |
| Receio | Perder controle do cliente, ter a lógica copiada, suporte do agente em produção |

**Querer usar um agente não comprova querer construir e vender agentes.** A validação de cada lado é separada ([pilot-plan.md](../validation/pilot-plan.md)).

## Qual lado atender primeiro

**Recomendação: o comprador primeiro, com catálogo curado.**

- Nós mesmos (operador) publicamos os primeiros agentes do nicho, junto com 1 a 3 criadores parceiros convidados que **trazem a própria carteira de escritórios**.
- Marketplace aberto só depois de haver demanda recorrente medida ([roadmap.md](../roadmap.md)).
- **Como resolver o início sem oferta nem demanda:**
  - a oferta inicial é produzida pela casa (curadoria);
  - a demanda vem de venda direta e de parceiros: consultores, associações, eventos de CRC e Sescon;
  - nenhum criador terceiro depende de tráfego do marketplace para ter retorno no primeiro ano.

## Proposta de valor

> **"Feche o mês de todos os clientes no prazo, sem perseguir documento por documento."**
> Um agente que cobra, recebe, confere e organiza os documentos do fechamento. Ele age com a sua aprovação, dentro de limites de gasto definidos, e mostra o resultado cliente a cliente.

### Posicionamento premium (hipótese)

- **Não é "chatbot barato".** É um operador de fechamento com garantias: nenhuma mensagem duplicada, aprovação humana, limite de gasto, trilha de auditoria, isolamento de dados.
- **Implantação acompanhada** (paga), com lista de documentos adaptada à carteira do escritório.
- **Preço ancorado no valor:** horas de assistente economizadas e prazos cumpridos, não em tokens ([pricing.md](pricing.md)).
