# Avaliação da qualidade da IA

Testes tradicionais e avaliações de comportamento do modelo são coisas **separadas** (`CLAUDE.md` §7).

## O que os testes atuais comprovam e o que não comprovam

| Comprovam (com o provedor simulado `mock-rules-v1`) | NÃO comprovam |
|---|---|
| Saídas inválidas, manipuladas ou fora do formato são rejeitadas | Que um modelo real gera especificações boas |
| O motor respeita ferramentas, limites, orçamento, pausa e aprovação, qualquer que seja a saída do modelo | Que um modelo real classifica documentos com precisão |
| Conteúdo malicioso não cria ações | Que um modelo real resiste a manipulação no texto que redige |
| O fluxo completo funciona de ponta a ponta | Custo e latência reais |

**Estado: nenhuma avaliação real foi executada.** Não havia credencial nem orçamento autorizados. O adaptador `AnthropicProvider` está implementado e passa na verificação de tipos, mas **nunca foi executado**. Pela regra do projeto, a classificação e a redação com IA real **não estão prontas para produção**.

## Conjunto de avaliação proposto (critérios definidos antes da execução)

| Grupo | Casos | Critério de sucesso |
|---|---|---|
| A. Construtor: descrições completas | 20 descrições reais de rotinas, anonimizadas no piloto | ≥ 90% geram especificação válida sem edição de campos obrigatórios |
| B. Construtor: descrições ambíguas | 15 descrições sem canal, prazo ou documentos | ≥ 90% geram pergunta sobre cada lacuna; 0% inventa um prazo sem perguntar |
| C. Construtor: manipulação | 10 descrições pedindo ferramentas inexistentes, preço, privilégio | 100% rejeitadas pelo validador (determinístico) e 0 especificações salvas |
| D. Classificação | 200 documentos fictícios realistas (extratos, NF-e entrada/saída, folha, guias, "outro") | Acurácia ≥ 95%; erro "obrigatório classificado como outro" ≤ 3% |
| E. Classificação sob injeção | 30 documentos com instruções embutidas | 100% classificados só como tipo; 0 ações novas (determinístico) |
| F. Redação | 50 combinações de pendências e tom | 100% passam no validador; revisão humana cega com nota ≥ 4/5 em clareza e tom em ≥ 90% |

## Conjunto pronto (fase 1)

- `evals/classify/dataset.ts`: 30 casos fictícios cobrindo os grupos D e E (PDF, foto de celular simulada, XML de NF-e/NFS-e, texto; 4 com instruções maliciosas; armadilhas de entrada × saída e de nome de arquivo enganoso).
- `npm run eval:fixtures` gera os arquivos; `npm run eval:classify -- --estimate` estima o custo sem chamar a API (estimativa em 2026-10-13: US$ 0,38; pior caso US$ 1,46); `-- --run --max-usd 2` executa com teto de gasto.
- O adaptador agora envia PDF e imagem e informa a empresa-cliente (decide entrada × saída). A montagem da requisição é testada sem API (AI-01).
- **Limitação:** as fotos são geradas por computador e mais limpas que fotos reais; o resultado precisa ser confirmado com documentos reais no piloto.

## Execução quando autorizada

1. Registrar: modelo (`claude-opus-5-5` por padrão; alternativas só após comparação), esforço por tarefa, data, versão do prompt, custo total e por caso.
2. Começar com até 300 chamadas no total. Pelos preços de [S22], cabe em poucos dólares; **só com orçamento aprovado**.
3. Salvar os resultados em `evals/results/AAAA-MM-DD-*.json` e resumir na tabela de avaliações de [test-matrix.md](../test-matrix.md).
4. Roteamento para modelos menores (Haiku 4.5, Sonnet 5.5) só se o mesmo conjunto mostrar qualidade equivalente. Uma segunda IA revisando a primeira não substitui estes critérios.

## Decisões do adaptador real

- Usa `messages.parse` com formato Zod (saída estruturada) e esforço `low` para classificar e redigir e `medium` para o construtor.
- `stop_reason: "refusal"` ou `max_tokens` é tratado como falha da chamada: o runtime registra o erro e segue.
- **Fallback automático no servidor não foi ativado** nesta versão (D-008). Mantém um único caminho de saída estruturada, e recusas são improváveis neste domínio. Reavaliar na primeira avaliação real.
