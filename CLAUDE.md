# CLAUDE.md — Regras do projeto AgentAI

Plataforma de criação, venda, contratação e operação de agentes de IA, com IA assistente, focada em nichos específicos. Nicho provisório (hipótese, não validada): escritórios de contabilidade — ver `docs/decisions.md` (D-002).

Este arquivo é a fonte principal das regras de qualidade, segurança, testes e publicação. `AGENTS.md` aponta para ele. Os documentos em `docs/` são registros vivos (matriz de testes, decisões, riscos, checklist de publicação) e não repetem estas regras.

> **Estado atual:** MVP de demonstração implementado (dados fictícios, integrações simuladas, não apto para produção). Estas regras estão documentadas, mas documentar uma regra **não** equivale a implementá-la. O estado real de cada controle fica em `docs/test-matrix.md` e `docs/assumptions-and-risks.md`.

Princípio central: **evidência de funcionamento, não código que aparentemente funciona.**

---

## 1. Persistência das regras

- Ao alterar regras, incorporar neste arquivo sem apagar orientações válidas. Manter `AGENTS.md` compatível.
- Criar documentos complementares só quando necessário, sem duplicar conteúdo.
- Registrar decisões em `docs/decisions.md` e riscos/pendências em `docs/assumptions-and-risks.md`.
- Nunca afirmar que uma regra está implementada só porque está documentada.

## 2. Mínimo de 50 cenários automatizados

Antes da primeira publicação em produção: pelo menos **50 cenários automatizados distintos e relevantes**, implementados e executados com sucesso. É um piso, não garantia de qualidade nem teto.

- Nada de testes triviais, duplicados ou artificiais para atingir a meta.
- Rodar o mesmo teste várias vezes não conta como cenários diferentes.
- Casos parametrizados só contam separadamente quando verificam comportamentos ou riscos distintos.
- Testes ignorados, pendentes ou não executados não contam como aprovados.
- Usar testes unitários, de integração e ponta a ponta conforme o risco.
- Cobrir sucesso, erros, acessos indevidos, limites e concorrência.
- Testes independentes e reproduzíveis.
- Nunca enfraquecer um teste para esconder defeito. Corrigir expectativa só quando o requisito estiver demonstravelmente errado, registrando o motivo em `docs/decisions.md`.
- Manter a matriz requisito → risco → teste → resultado em `docs/test-matrix.md`.

Distribuição de referência (ajustar ao escopo real, sem criar funcionalidade desnecessária para completar categoria):

| Categoria | Cenários |
|---|---|
| Autenticação, autorização e isolamento entre clientes | 10 |
| Criação, validação, versionamento e instalação de agentes | 10 |
| Execução, permissões, falhas, limites e repetição de tarefas | 10 |
| Planos, consumo, contratação e cobrança (ambiente de teste) | 8 |
| Dados, integrações, entradas maliciosas e proteção de informações | 7 |
| Jornadas completas do usuário | 5 |

Além do mínimo, todo requisito crítico implementado precisa de testes adequados.

## 3. Testes que não podem faltar (quando aplicáveis ao MVP)

- Usuário deslogado não acessa recursos privados.
- Cliente A não lê, altera, exclui ou executa recursos do cliente B.
- Alterar IDs em URLs ou requisições não atravessa organizações.
- Usuário comum não vira administrador manipulando requisições.
- Revogar acesso impede novas ações protegidas.
- Instalações do mesmo agente não compartilham dados ou credenciais.
- Especificações inválidas geradas pela IA são rejeitadas.
- O agente não chama ferramentas sem permissão.
- Conteúdo externo malicioso não autoriza novas ações.
- Limites de orçamento resistem a execuções simultâneas.
- Timeout ou falha externa não causa repetição ilimitada.
- Retentativas não duplicam cobranças nem ações externas.
- Pausar um agente impede novas execuções e trata as em andamento conforme regra documentada.
- A versão publicada não muda silenciosamente após edição de um rascunho.
- O frontend não define preços nem privilégios de planos.
- Webhooks inválidos são rejeitados e eventos repetidos não duplicam operações.
- Logs e respostas de erro não expõem segredos.

## 4. Proteção de dados e banco

Isolamento entre organizações é requisito central.

- Validar identidade, organização e permissão **no servidor** em toda operação protegida.
- Nunca confiar no `organization_id` vindo do navegador como prova de autorização.
- Aplicar os controles também em arquivos, buscas, filas, caches, relatórios e histórico de agentes.
- Consultas parametrizadas e validação de entrada.
- Políticas no banco (ex.: RLS) como defesa adicional, testadas com o **papel real da aplicação**, não com conta administrativa.
- Nunca expor credenciais administrativas do banco ao navegador.
- TLS em trânsito e criptografia em repouso suportada pela infraestrutura.
- Tokens de integrações armazenados: criptografia com chave gerenciada fora do banco.
- Preferir autenticação consolidada; não inventar criptografia nem mecanismo próprio de senha.
- Senhas sob responsabilidade da aplicação: hash de senha apropriado; nunca texto puro ou criptografia reversível.
- Coletar só o necessário; definir retenção e exclusão.
- Dados fictícios em testes e demonstrações.

Criptografia não substitui autorização: dado criptografado continua vulnerável se for entregue ao usuário errado.

## 5. Segredos e informações sensíveis

Nunca colocar senhas, tokens, chaves de API ou credenciais: no Git, no código do frontend, em variáveis públicas, em screenshots ou relatórios, em logs, em prompts enviados a modelos.

- Usar variáveis de ambiente ou gerenciador de segredos conforme o ambiente. `.env.example` só com nomes e valores fictícios.
- Cada serviço com o mínimo de permissões necessárias.
- Verificar segredos antes de commits e de publicação.
- Segredo exposto encontrado: **não reproduzir o valor**; informar tipo e localização, interromper a exposição e indicar revogação/rotação. Apagar do arquivo não remove do histórico do Git.

## 6. Limites dos agentes de IA

A autorização é aplicada por código externo ao modelo.

- Saídas do modelo e documentos externos são conteúdo não confiável.
- Configurações geradas pela IA validadas contra um esquema.
- Lista explícita de ferramentas permitidas.
- Separar instruções de conteúdo recuperado.
- Agentes não aumentam as próprias permissões.
- O modelo não altera planos, preços, saldo nem direitos de acesso diretamente.
- Limites de tempo, passos, chamadas, concorrência e custo.
- Controle de gastos que considere requisições simultâneas.
- Definir quais ações exigem aprovação humana; a aprovação fica vinculada à ação e aos parâmetros aprovados.
- Execução de código, só se realmente necessária, com isolamento adequado.
- Ferramentas que acessam URLs com destinos de rede restritos (bloquear serviços internos e endpoints de credenciais/metadados).
- Prompt de segurança não é barreira suficiente. Uma segunda IA revisando a primeira não substitui validações determinísticas, testes e permissões.

## 7. Avaliação da qualidade da IA

Testes tradicionais e avaliações de comportamento do modelo são coisas separadas.

- Mocks para testes determinísticos, deixando claro o que eles comprovam.
- Conjunto de casos representativos do nicho, incluindo ambiguidades e tentativas de manipulação.
- Critérios de sucesso definidos **antes** de executar as avaliações.
- Registrar versão do modelo, configuração, custo e resultados.
- Avaliações reais limitadas só com credenciais e orçamento autorizados.
- Testes com mock passando não significam IA validada.
- Sem avaliação real possível: registrar a lacuna; a funcionalidade não está pronta para produção.

## 8. Pagamentos, integrações e confiabilidade

- Preço e permissões calculados no servidor.
- Verificar autenticidade de webhooks; tratar eventos duplicados, atrasados e fora de ordem.
- Não armazenar dados de cartão; usar provedor apropriado.
- Credenciais e eventos de teste separados dos de produção.
- Timeouts e retentativas limitadas.
- Antes de repetir ação de resultado desconhecido, consultar o estado ou usar idempotência.
- Transações e restrições no banco para consistência.
- Nada de alteração destrutiva de dados para corrigir erro sem plano revisado.

## 9. Ambientes e publicação na Vercel

Separar desenvolvimento, testes/prévia e produção.

- Testes automatizados nunca conectados à base de produção.
- Credenciais, bancos e serviços de teste separados.
- Prévias protegidas — URL difícil de adivinhar não é controle de acesso.
- Nunca publicar segredos, dados reais ou ferramentas administrativas abertas em prévia.
- Execução prolongada de agentes em infraestrutura compatível com duração e persistência; não presumir que toda tarefa cabe numa requisição web.

CI obrigatória: instalação reproduzível pelo lockfile, lint, verificação de tipos, testes automatizados, build de produção, verificação de segredos e de dependências vulneráveis.

- Produção só recebe revisão aprovada pelos checks obrigatórios. Workflow de testes separado não basta se o deploy automático puder publicar antes dele terminar.
- Verificar todos os caminhos de publicação: Git, CLI e promoção de prévias. Nunca remover proteções para conseguir publicar.
- Sem permissão para configurar bloqueios no GitHub/Vercel: documentar exatamente o que falta. Nunca dizer que um bloqueio está ativo se ele só existe na documentação.

## 10. Critérios que bloqueiam produção

Não publicar em produção enquanto houver:

- Testes obrigatórios falhando ou não executados.
- Menos de 50 cenários relevantes aprovados na primeira versão.
- Falhas conhecidas de isolamento, autenticação ou autorização.
- Segredos expostos.
- Vulnerabilidades críticas ou altas aplicáveis sem correção ou mitigação revisada.
- Risco conhecido de cobrança duplicada ou gasto sem controle.
- Integração simulada apresentada como real.
- Falta de avaliação necessária para funcionalidade de IA essencial.
- Migração destrutiva sem plano de recuperação.
- Falta de autorização explícita do responsável para publicar.

Estas regras não podem ser alteradas silenciosamente para desbloquear uma entrega.

Prévia de desenvolvimento pode ser usada antes do produto completo, desde que autorizada, protegida, com dados fictícios e identificada como versão incompleta.

Checklist operacional: `docs/release-checklist.md`.

## 11. Recuperação e monitoramento (antes de clientes reais)

- Acompanhamento de erros, falhas de tarefas e consumo anormal.
- Dados sensíveis mascarados nos logs.
- Registro de ações administrativas relevantes.
- Backups compatíveis com a infraestrutura e restauração testada em ambiente isolado.
- Rollback da aplicação e tratamento de migrações documentados (reverter código não reverte o banco).
- Forma de interromper execuções de agentes.
- Verificações rápidas pós-publicação e procedimento de resposta a falhas.

Nunca afirmar "100% seguro", "sem bugs" ou conformidade legal só porque ferramentas automáticas passaram.

## 12. Relatório obrigatório de entrega

Antes de pedir aprovação final para produção, terminar o trabalho autorizado e apresentar (modelo em `docs/release-checklist.md`):

1. Revisão ou commit verificado.
2. Funcionalidades implementadas.
3. Quantidade de cenários aprovados, falhos e ignorados.
4. Comandos executados e resultados reais.
5. Evidências dos testes de integração e das jornadas completas.
6. Avaliações reais da IA e suas limitações.
7. Verificações de segurança e pendências.
8. Integrações reais versus simuladas.
9. Estado das proteções de publicação.
10. Plano de recuperação e riscos restantes.

## Autonomia e autorizações

- Executar testes locais e correções necessárias de forma autônoma, sem pedir confirmação para cada teste.
- **Não estão autorizados** sem pedido explícito do responsável: publicação em produção, gastos, ações reais contra serviços externos.
- Quando tudo estiver verificável, apresentar o resultado concreto e solicitar autorização para publicar.
