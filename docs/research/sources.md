# Fontes

Registro único de fontes. Os demais documentos citam pelo ID (`[S01]`). Data de consulta de todas: **2026-10-11**, salvo indicação.

**Tipo:** `observado` (dado medido/registrado), `estimativa` (estimativa de terceiros), `projeção` (valor futuro), `preço` (página oficial de preços), `alegação` (afirmação de fornecedor sem metodologia), `hipótese` (nossa).
**Confiança:** alta / média / baixa — julgamento nosso sobre a qualidade da fonte e o quanto conseguimos verificar.
**Acesso:** `página lida` (conteúdo da página consultado) ou `apenas busca` (só vimos o resumo do buscador; não conta como verificação completa).

## Câmbio

| ID | Fonte | Publicação | Dado | Tipo | Confiança | Acesso |
|---|---|---|---|---|---|---|
| S01 | Banco Central do Brasil, API PTAX — https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/ | diária | PTAX venda 09/10/2026: **R$ 4,9892/US$**. Entre 01 e 09/10/2026 variou de 4,9698 a 5,2238 | observado | alta | página lida (JSON oficial) |

Conversões nos documentos usam **US$ 1 = R$ 4,9892** (S01) e são **ilustrativas**: converter não valida preço nem tamanho de mercado em outra moeda.

## Mercado global de IA e agentes

| ID | Fonte | Publicação | Dado | Região/período/definição | Tipo | Confiança | Acesso |
|---|---|---|---|---|---|---|---|
| S02 | MarketsandMarkets, release via PR Newswire — https://prnewswire.co.uk/news-releases/ai-agents-market-worth-52-62-billion-by-2030---exclusive-report-by-marketsandmarkets-302435498.html | 2025-04-23 | US$ 7,84 bi (2025) → US$ 52,62 bi (2030), CAGR 46,3% | Global; "AI agents" = agentes prontos e customizados, empresas e consumidores; ano-base 2024 | estimativa + projeção | média-baixa (metodologia paga, não auditável) | página lida |
| S03 | Grand View Research, release via PR Newswire — https://www.prnewswire.co.uk/news-releases/ai-agents-market-size-to-hit-50-31-billion-by-2030-at-cagr-45-8---grand-view-research-inc-302447061.html | 2025-05-06 | US$ 50,31 bi em 2030, CAGR 45,8% (2025–2030); valor-base não informado no release | Global; inclui chatbots, assistentes virtuais e sistemas autônomos | projeção | baixa-média | página lida |
| S04 | GM Insights — https://www.gminsights.com/industry-analysis/ai-agents-market | n/d | US$ 7,7 bi (2025) → US$ 105,6 bi (2034) | Global | estimativa + projeção | baixa | apenas busca |
| S05 | Gartner, "Gartner Forecasts Worldwide AI Spending to Grow 47% in 2026" — https://www.gartner.com/en/newsroom/press-releases/2026-05-19-gartner-forecasts-worldwide-ai-spending-to-grow-47-percent-in-2026 | 2026-05-19 (atualizado 2026-08-14) | Gasto mundial com IA (US$ milhões) 2025 / 2026 / 2027: **total 1.764.947 / 2.595.667 / 3.493.358**; AI Software 282.897 / 453.209 / 638.431; AI Services 436.351 / 585.527 / 759.418; AI Models 15.494 / 32.604 / 59.161; AI Application Development Platforms 6.587 / 8.416 / 10.922; AI Infrastructure 975.581 / 1.431.509 / 1.890.310 | Global; gasto de usuários finais em todas as categorias de IA (infraestrutura é mais de 45%) | estimativa (2025) + projeção (2026–27) | média-alta (fonte primária; metodologia completa é paga) | página lida (o domínio principal bloqueou a leitura automática; lido no espelho oficial `gcom.pdo.aws.gartner.com`) |
| S06 | Software Strategies Blog citando o relatório Gartner "Forecast: AI Spending, Worldwide, 2024–2029, 4Q25" — https://softwarestrategiesblog.com/2026/02/16/gartner-forecasts-agentic-ai-overtakes-chatbot-spending-2027/ | 2026-02-16 | "Agentic AI" US$ 201,9 bi em 2026 (+141%); US$ 752,7 bi em 2029; ultrapassaria chatbots em 2027 | Global; inclui capacidades agênticas embutidas em software corporativo (definição ampla) | projeção | baixa (secundária; release primário não localizado) | apenas busca |
| S07 | Gartner, "Gartner Predicts Over 40% of Agentic AI Projects Will Be Canceled by End of 2027" — https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027 | 2025-06-25 | Mais de 40% dos projetos de IA agêntica cancelados até 2027 (custos, valor incerto, controles de risco); "agent washing"; ~130 fornecedores "reais"; enquete com 3.412 participantes de webinar: 19% investimento significativo | Global | projeção + enquete não probabilística | média | apenas busca (leitura bloqueada, código 403) |
| S08 | IDC — https://www.idc.com/resource-center/press-releases/agentic-ai-to-dominate-it-budget-expansion-over-next-five-years-exceeding-26-of-worldwide-it-spending-and-1-3-trillion-in-2029-according-to-idc/ | 2025-08-26 | Gasto com IA de US$ 1,3 tri em 2029; crescimento de 31,9% a.a. (2025–2029); IA agêntica acima de 26% do gasto mundial de TI | Global; aplicações, plataformas de agentes, infraestrutura e serviços | projeção | média | página lida |
| S09 | IDC via Eu Quero Investir — https://euqueroinvestir.com/economia/brasil-lidera-investimentos-em-ia-na-america-latina-em-2026-diz-idc | 2026-04-17 | América Latina: US$ 10 bi em IA em 2026; **Brasil: US$ 4,2 bi** (41,7%) | AL/Brasil; infraestrutura, plataformas, aplicações e serviços gerenciados | projeção | média-baixa (secundária) | página lida |
| S10 | Gartner (RPA) — https://www.gartner.com/en/newsroom/press-releases/2022-08-1-rpa-forecast-2022-2q22-press-release | 2022-08-01 | Software de RPA: US$ 2.389 mi (2021), US$ 2.854 mi (2022), US$ 3.352 mi (2023, previsão) | Global; gasto de usuário final | estimativa + projeção (antiga) | média (dado defasado) | apenas busca |
| S38 | fast.io (secundária) — https://fast.io/resources/top-ai-agent-marketplaces/ | 2026 | Salesforce AgentExchange com mais de 200 parceiros no lançamento; Microsoft Marketplace com mais de 4.000 apps e agentes de IA | Global | alegação | baixa | apenas busca |

## Brasil — nicho contábil

| ID | Fonte | Publicação | Dado | Tipo | Confiança | Acesso |
|---|---|---|---|---|---|---|
| S11 | CFC, "Contabilidade: mais do que números…" — https://cfc.org.br/noticias/contabilidade-mais-do-que-numeros-um-pilar-para-a-economia-e-a-sociedade/ | 2025-04-25 | **97.836 organizações contábeis**; 529.505 profissionais registrados | observado (registro do conselho) | alta | página lida |
| S12 | CFC, consulta de profissionais ativos por região — https://www3.cfc.org.br/spw/crcs/ConsultaPorRegiao.aspx?Tipo=0 | atualizado em 11/10/2026 | 549.265 profissionais ativos (416.093 contadores; 133.172 técnicos); Sudeste com cerca de 50% | observado | alta | página lida |
| S13 | RDD10+, "Evolução das Organizações Contábeis no Brasil (1995–2024)" — https://www.robertodiasduarte.com.br/relatorio-executivo-evolucao-das-organizacoes-contabeis-no-brasil-1995-2024/ | 2025-05-28 | Cerca de 98.469 organizações em abr/2025; por tipo: sociedades ~33%, sociedade limitada unipessoal (SLU) ~33%, empresário individual ~26%, MEI pequeno; ~70 mil em 2020 | estimativa secundária (relatório gerado por IA a partir de dados do CFC) | baixa | página lida |
| S14 | CFC, pesquisa IOB/CFC/Fenacon sobre IA — https://cfc.org.br/noticias/pesquisa-mostra-avanco-da-inteligencia-artificial-na-rotina-dos-profissionais-da-contabilidade/ | 2026-09-03 | Coleta em abr–mai/2026, 393 respondentes: 78% usam IA semanalmente, 53% diariamente; principais desafios: retrabalho manual 34%, falta de tempo para análise 20%, dificuldade de integração 17%, erros em tarefas repetitivas 15% | observado (amostra não probabilística) | média | página lida |
| S15 | Contábeis, "Como escritórios contábeis podem usar agentes de IA…" — https://www.contabeis.com.br/noticias/77278/ | 2026-06-08 | "Cerca de 80% das mensagens" entre contador e cliente seriam repetitivas (atribuído à Whats Contábil) | alegação sem metodologia | baixa | página lida |
| S16 | Fenacon (ofício, PDF) — https://fenacon.org.br/wp-content/uploads/2024/01/OF.P.003-Oficio-alerta-ao-PGFN_v1-1.pdf | 2024 | Cerca de 80 mil organizações contábeis, média de 9 empregados e 78 clientes por escritório; ~3,8 milhões de empresas atendidas | estimativa | baixa (**não verificada**: o PDF não pôde ser lido) | apenas busca |
| S17 | Thomson Reuters, aquisição da Gestta — https://www.thomsonreuters.com.br/pt/sala-de-imprensa/thomson-reuters-anuncia-aquisicao-de-gestta.html | 2022-04-26 | Gestta automatiza fluxos de trabalho, atendimento e arquivo de documentos de escritórios; mais de 600 mil empresas cadastradas nos sistemas de escritórios atendidos; valor da compra não divulgado | observado + alegação | média | página lida |
| S18 | Acessórias — http://www.acessorias.com/site/ | consulta | Gestão de documentos, WhatsApp (via Komunic), protocolo digital de entrega, portal/app do cliente, painéis; sem preço público | alegação (site do fornecedor) | média | página lida |
| S35 | Contábeis, "Reforma tributária 2026: veja o que muda na fase de transição" — https://www.contabeis.com.br/noticias/73889/ | 2026 | 2026 é ano de teste (CBS 0,9% e IBS 0,1% informativos); CBS efetiva em 2027; transição até 2033 | observado (cronograma legal, fonte secundária) | média | apenas busca |
| S37 | Qive (ex-Arquivei) — https://qive.com.br/blog/como-funciona-o-arquivei | n/d | Mais de 140 mil empresas usam a plataforma de captura de documentos fiscais | alegação | baixa | apenas busca |
| S40 | Receita Federal/Sebrae via Data Sebrae (secundária) | 2024 | Mais de 22 milhões de CNPJs no Simples Nacional, cerca de 15 milhões MEI | observado (secundário) | baixa | apenas busca |

## Brasil — outros nichos

| ID | Fonte | Publicação | Dado | Tipo | Confiança | Acesso |
|---|---|---|---|---|---|---|
| S27 | CQCS (dados da SUSEP) — https://cqcs.com.br/noticia/numero-de-empresas-corretoras-de-seguros-em-atividade-volta-a-cair/ | 2026-08-26 | 64.794 corretoras PJ ativas; 85.710 corretores pessoa física (dados de 19/08/2026) | observado (secundário) | média | página lida |
| S28 | Startups.com.br, Lastro/Lais — https://startups.com.br/negocios/proptechs/proptech-lastro-levanta-serie-a-de-r-85m-liderada-pela-prosus/ | n/d | Série A de R$ 85 mi liderada pela Prosus; cerca de mil imobiliárias atendidas, incluindo 9 das 10 maiores | observado + alegação | média-baixa | apenas busca (leitura bloqueada) |
| S29 | InfoMoney — https://www.infomoney.com.br/business/enquanto-85-das-imobiliarias-nos-eua-usam-ia-brasil-ainda-engatinha-com-19/ | n/d | 19% das imobiliárias brasileiras usam IA, contra 85% nos EUA | estimativa (metodologia não vista) | baixa | apenas busca (leitura bloqueada) |
| S30 | Paraíba Business — https://paraibabusiness.com.br/brasil-ja-conta-com-650-mil-corretores-de-imoveis-aponta-pesquisa/ | n/d | ~650 mil corretores de imóveis (pessoas físicas); número de imobiliárias PJ não encontrado | estimativa | baixa | apenas busca |
| S31 | ABCdoABC citando CFO — https://abcdoabc.com.br/brasil-e-o-pais-com-mais-dentistas-no-mundo/ | n/d | Mais de 400 mil dentistas; mais de 52 mil clínicas odontológicas | observado (secundário) | baixa | apenas busca |
| S32 | Aurora Inbox — https://www.aurorainbox.com/pt/chatbot-clinicas-dentales-whatsapp/ | 2026 | Alega redução de faltas em consultas (no-show) com lembretes automáticos | alegação de fornecedor | baixa | apenas busca |
| S33 | CQCS, Segura — https://cqcs.com.br/noticia/segura-levanta-r-45-milhoes-para-resolver-a-complexidade-operacional-entre-seguradoras-e-corretores-com-ia/ | 2026-04-27 | Captação de R$ 45 mi (a16z, Kaszek); IA para corretores, incluindo WhatsApp | observado (secundário) | média-baixa | apenas busca (leitura expirou) |
| S34 | Aurum/Astrea e documentos de licitação (Jusbrasil) | 2025–2026 | Astrea com plano básico de R$ 209; pacote corporativo Jusbrasil + Jus IA de R$ 22.581/ano em contratação pública | preço (secundário) | baixa-média | apenas busca |
| S36 | Digisac e Meu Contador Online (ZAP MEI) — https://www.meucontadoronline.com.br/blog/contador-para-mei-no-whatsapp/ | 2026 | Chatbot de WhatsApp com "agente inteligente"; ZAP MEI a R$ 49,90/mês | preço/alegação | baixa | apenas busca |

## Concorrentes de plataforma, preços e custos

| ID | Fonte | Dado | Tipo | Confiança | Acesso |
|---|---|---|---|---|---|
| S19 | Relevance AI, docs de preço — https://relevanceai.com/docs/get-started/pricing.md | Pro: US$ 19/mês (anual) ou US$ 29 (mensal), 2.500 ações/mês, US$ 20 em créditos de modelo. Team: US$ 234 (anual) ou US$ 349 (mensal), 7.000 ações/mês, US$ 70 em créditos. Ação extra: US$ 80 por mil. Enterprise sob consulta. Inclui acesso a marketplace | preço | alta | página lida |
| S20 | n8n — https://n8n.io/pricing/ | Starter €20, Pro €50, Business €667 por mês; 2,5 mil / 10 mil / 40 mil execuções; edição Community gratuita para auto-hospedar | preço | média (a leitura automática não separou preço mensal e anual) | página lida |
| S21 | Salesforce Agentforce — https://www.salesforce.com/agentforce/pricing/ | Flex Credits: US$ 500 por 100 mil créditos, ação = 20 créditos (≈ US$ 0,10 por ação); US$ 2 por conversa; add-ons de US$ 125 a 150 por usuário/mês; Agentforce Max a partir de US$ 550 por usuário/mês | preço | alta | página lida |
| S22 | Anthropic, preços — https://platform.claude.com/docs/en/about-claude/pricing | Por milhão de tokens (entrada / saída): Opus 5.5 US$ 4 / 20 (leitura de cache US$ 0,20); Sonnet 5.5 US$ 2 / 10 (cache US$ 0,10); Haiku 4.5 US$ 1 / 5 (cache US$ 0,10); Fable 5.1 US$ 10 / 50. API Batch com 50% de desconto | preço | alta | página lida |
| S23 | Stripe Brasil — https://stripe.com/br/pricing | Cartão nacional 3,99% + R$ 0,39; cartão internacional +2%; boleto R$ 3,45; Pix 1,19% (só por convite); Billing 0,7% do volume; chargeback R$ 55 | preço | alta | página lida |
| S24 | Meta, WhatsApp Business Platform — https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing | Cobrança por mensagem de template entregue (desde 01/07/2025); mensagens de serviço dentro da janela de atendimento são grátis; cobrança em BRL disponível. **Tarifas do Brasil não obtidas** (ficam no rate card) | preço (estrutura) | alta para a estrutura; valores são lacuna | página lida |
| S25 | Vercel — https://vercel.com/pricing | Pro: US$ 20 por assento/mês com US$ 20 de crédito de uso incluído | preço | alta | página lida |
| S26 | Supabase — https://supabase.com/pricing | Pro: US$ 25/mês, US$ 10 de crédito de computação, 8 GB, backup diário com 7 dias de retenção; PITR (restauração para um ponto no tempo) a US$ 100/mês | preço | alta | página lida |

## Lacunas conhecidas

- Receita mundial **realizada** de "agentes de IA": não existe medida auditada; só estimativas de consultorias, com definições diferentes (S02–S06).
- Número de escritórios contábeis por porte (funcionários e clientes): sem fonte primária verificada (S13 e S16 têm confiança baixa).
- Tarifas do WhatsApp para o Brasil (S24) e preços públicos de Acessórias, Gestta, Onvio e Lais.
- Gasto atual dos escritórios com software e com horas de cobrança de documentos: **só entrevistas podem responder** (ver `docs/validation/customer-interviews.md`).
