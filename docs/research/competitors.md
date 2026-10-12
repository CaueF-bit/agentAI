# Concorrentes e diferenciação

Consulta feita em 2026-10-11. Fontes em [sources.md](sources.md). Quando não houver preço público, está escrito "sob consulta". Nada aqui afirma que "não existem concorrentes" ou que "somos os primeiros".

## Três tipos de "marketplace" que não devem ser confundidos

1. **Marketplace de templates.** O comprador copia uma configuração e opera sozinho, por exemplo templates de n8n ou fluxos prontos. Quem criou o template não opera nada.
2. **Catálogo de agentes hospedados.** O agente roda na plataforma de quem vende, e o comprador conecta os próprios dados. Exemplos: Salesforce AgentExchange, Microsoft Marketplace [S38]. **É o nosso modelo-alvo.**
3. **Contratação de serviços.** O comprador contrata uma pessoa ou agência para construir e manter a automação.

## Tabela comparativa

| Solução | Tipo | Público e problema | Criação por linguagem natural | Integrações e profundidade no nicho contábil | Execução e monitoramento | Agências e múltiplos clientes | Marketplace e monetização de terceiros | Preço e restrições | Fonte |
|---|---|---|---|---|---|---|---|---|---|
| Relevance AI | Construtor generalista de agentes | Times de vendas e operações; força de trabalho de IA | Sim (construtor assistido) | Mais de 2.000 integrações genéricas; nenhuma específica do nicho | Histórico de tarefas, analytics no plano Team | Projetos e usuários por plano | "Marketplace Access" para agentes e ferramentas prontos; monetização por terceiros não confirmada | Pro US$ 19–29/mês com 2.500 ações; Team US$ 234–349 com 7.000; ação extra US$ 80 por mil | S19 |
| n8n | Automação de fluxos com nós de IA | Times técnicos; automação genérica | Assistente de IA (créditos) | Centenas de conectores genéricos; nicho depende de quem constrói | Logs de execução; concorrência limitada por plano | Projetos compartilhados; muito usado por agências | Templates da comunidade (tipo 1) | €20 / €50 / €667 por mês; edição Community gratuita para auto-hospedar | S20 |
| Salesforce Agentforce + AgentExchange | Plataforma corporativa de agentes | Empresas que já usam Salesforce | Sim (Agent Builder) | Profunda no CRM Salesforce; nenhuma específica para contabilidade no Brasil | Robusto, voltado a grandes empresas | Sim | Catálogo de parceiros (tipo 2) | US$ 0,10 por ação, US$ 2 por conversa ou US$ 125+ por usuário/mês | S21, S38 |
| Thomson Reuters Domínio / Onvio + Gestta | Software vertical contábil (incumbente) | Escritórios contábeis: gestão, obrigações, portal, atendimento | Não confirmado | Profunda: ERP contábil e fiscal e portal do cliente | Fluxos de trabalho e tarefas | Sim (escritório com muitos clientes) | Não identificado | Sob consulta | S17 |
| Acessórias | Software vertical (gestão de escritório) | Escritórios contábeis: entregas, protocolo, documentos, portal | Não confirmado | Documentos, WhatsApp (Komunic), protocolo digital | Painéis e acompanhamento de entregas | Sim | Não identificado | Sob consulta | S18 |
| Qive (ex-Arquivei) | Vertical fiscal | Captura automática de documentos fiscais eletrônicos | Não | Profunda em XML e notas fiscais | Plataforma de documentos | Uso por escritórios para muitos clientes | Não | Sob consulta | S37 |
| Chatbots de WhatsApp (Digisac e similares) | Atendimento genérico com "agente inteligente" | Atendimento de PMEs | Parcial | Rasa no nicho | Painel de atendimento | Multiatendentes | Não | Sob consulta / teste grátis | S36 |
| Alternativa manual | Planilha, e-mail e WhatsApp pessoal da equipe | Escritório cobra documentos um a um | — | — | Nenhum (memória da equipe) | — | — | Custo em horas da equipe (**a medir em entrevistas**) | hipótese |
| Agências e freelancers de automação | Serviço sob medida | Escritório contrata a construção | Depende de quem constrói | Depende de quem constrói | Geralmente fraco depois da entrega | — | Contratação de serviço (tipo 3) | Projeto + mensalidade | hipótese |

## Leitura

- **Generalistas** (Relevance, n8n, Agentforce) resolvem a construção, mas deixam com o cliente:
  - o conhecimento do nicho (quais documentos cobrar, por regime e competência);
  - a implantação;
  - a garantia de que o agente não envia mensagens indevidas.
- **Incumbentes verticais** (Thomson Reuters, Acessórias) têm distribuição e integração profundas. **São o maior risco competitivo:** se lançarem um agente de cobrança embutido no plano atual, a nossa proposta perde força (critério de abandono em [niche-selection.md](niche-selection.md)).
- **Brecha que exploramos (hipótese):**
  - uma camada de agente operacional especializada no fechamento mensal;
  - que funciona ao lado do sistema que o escritório já usa, sem exigir troca de ERP;
  - com limites, aprovações e métricas de resultado prontos.

## Por que um escritório trocaria a solução atual pela nossa

Foco em nicho não basta. O que propomos entregar:

1. **Componentes especializados:** lista de documentos por regime tributário e perfil, classificador de documentos contábeis e modelos de lembrete testados no tom adequado.
2. **Implantação em dias, não semanas:** importar a lista de clientes, escolher o modelo de lista, aprovar os primeiros lembretes. A IA construtora ajusta o agente a partir de uma descrição.
3. **Confiabilidade verificável:**
   - nenhum lembrete duplicado (idempotência);
   - aprovação humana configurável antes de enviar mensagens;
   - limite de gasto mensal que não estoura nem com execuções simultâneas;
   - pausa imediata.
4. **Resultado mensurável no painel:** percentual de clientes com documentação completa até o dia X, horas estimadas economizadas e pendências por cliente.

Essas promessas são **hipóteses** até o piloto medir resultados ([pilot-plan.md](../validation/pilot-plan.md)).
