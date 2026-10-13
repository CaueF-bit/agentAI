# Visão

## O que queremos construir

Uma plataforma premium, focada em nicho, para **criar, vender, contratar e operar agentes de IA**. Ela combina duas lógicas:

- **Infraestrutura comercial no estilo Shopify:** quem cria agentes ganha hospedagem, cobrança, limites, auditoria e monitoramento sem montar nada disso.
- **Descoberta e contratação no estilo marketplace:** o comprador encontra agentes prontos para o seu nicho, contrata e conecta os próprios dados.

Uma **IA construtora** transforma uma descrição em linguagem natural ("quero cobrar os extratos dos meus clientes até o dia 5…") em uma especificação estruturada, validada e testável. Ela é montada com componentes e ferramentas preparados para o nicho.

A plataforma é **assistida e parcialmente gerenciada por IA, mas não autônoma sem limites**:

- permissões, orçamento, ações sensíveis e decisões administrativas têm controles explícitos;
- esses controles são aplicados por código fora do modelo (regras em `CLAUDE.md` §6).

## Papéis

| Papel | Quem é | O que faz |
|---|---|---|
| Criador | Especialista, consultoria, software house, escritório que padronizou uma rotina | Descreve, configura, testa e publica versões de agentes; recebe repasse |
| Comprador | Empresa do nicho (no início, escritório contábil) | Contrata, conecta dados e canais, define orçamento e aprovações, acompanha resultados |
| Operador da plataforma | Nós | Curadoria do catálogo, qualidade, infraestrutura, cobrança, suporte, interrupção de emergência |

Uma mesma organização pode ser criadora e compradora.

## Primeiro nicho e primeiro fluxo (hipótese provisória)

- **Nicho:** organizações contábeis no Brasil.
- **Fluxo:** Agente de Fechamento Mensal (cobrança, recebimento, conferência e organização dos documentos dos clientes).
- **Justificativa:** [niche-selection.md](research/niche-selection.md).
- **Validação comercial:** **não realizada** ([pilot-plan.md](validation/pilot-plan.md)).

## Princípios de produto

1. **Resultado mensurável antes de autonomia.** Cada agente mostra o que fez, quanto custou e o que ficou pendente.
2. **Humano no controle das ações externas.** Aprovação configurável, vinculada à ação e aos parâmetros exatos.
3. **Versões imutáveis.** O comprador usa uma versão publicada específica; editar um rascunho nunca muda o que está em produção.
4. **Isolamento por cliente** como requisito central: dados, credenciais e histórico.
5. **Previsibilidade de custo.** Limites de gasto que resistem a execuções simultâneas.

## O que o app nunca pode fazer

Critério para decidir rápido quando uma ideia parece boa mas descaracteriza o produto. Mudar esta lista exige registro em [decisions.md](decisions.md).

1. **Nunca fazer o trabalho do contador.** O agente cobra, recebe e organiza. Não transmite obrigações, não emite guias, não altera a escrituração, não dá orientação tributária.
2. **Nunca falar com o cliente do escritório em nome da plataforma.** Toda mensagem sai com a identidade do escritório e, por padrão, só depois de aprovada por alguém de lá.
3. **Nunca exigir que o escritório troque o sistema que já usa.** Funciona ao lado do ERP e do portal atuais; não vira um ERP contábil.
4. **Nunca cobrar de surpresa.** Passou do limite, bloqueia e avisa; não fatura excedente sozinho.
5. **Nunca usar os dados de um escritório para outro**, nem para melhorar agentes de terceiros, sem autorização expressa.
6. **Nunca prometer economia ou resultado** que o próprio escritório não consiga ver medido no painel.
7. **Nunca publicar no catálogo um agente sem versão testada** e sem limites declarados.

## Horizonte

| Fase | Conteúdo |
|---|---|
| Agora (MVP de demonstração) | Um nicho, um fluxo, catálogo curado, modo de teste |
| Piloto | 3 a 5 escritórios reais, com análise jurídica e de LGPD e integrações mínimas reais (e-mail e upload) |
| Expansão | Mais fluxos no mesmo nicho, criadores parceiros, plano de infraestrutura para criadores |
| Futuro | Marketplace aberto, outros nichos, expansão internacional |

Detalhes em [roadmap.md](roadmap.md).

**Nome definitivo da empresa e licença do código: decisões pendentes** ([decisions.md](decisions.md)). "AgentAI" é só o nome de trabalho do repositório.
