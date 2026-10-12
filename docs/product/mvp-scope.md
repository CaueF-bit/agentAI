# Escopo do MVP

**Um nicho** (organizações contábeis), **um fluxo** (Fechamento Mensal) e **integrações simuladas**.

## Dentro do MVP

- Página inicial com a proposta de valor do nicho e aviso de modo de demonstração.
- Login de demonstração com personas fictícias.
  - Só funciona com `DEMO_MODE=true`.
  - Em produção, deve ser trocado por autenticação consolidada ([decisions.md](../decisions.md), D-006).
- Catálogo curado com exemplos fictícios, página de detalhe e planos.
- IA construtora:
  - descrição → especificação + perguntas;
  - formulário editável;
  - validação.
  - Provedor simulado por padrão; adaptador Anthropic opcional, que exige credencial autorizada.
- Teste em sandbox, sem envio.
- Publicação de versões imutáveis.
- Contratação em modo de teste com webhook assinado simulado.
- Instalação por comprador:
  - conexões cifradas;
  - orçamento;
  - concorrência;
  - política de aprovação.
- Execução do fluxo:
  - classificação de documentos;
  - conferência da lista de documentos;
  - redação de lembretes;
  - fila de aprovação;
  - envio simulado idempotente com retentativas limitadas.
- Painel de execuções, passos, pendências, mensagens e consumo.
- Pausa e retomada; interruptor global do operador; retirada de anúncio; trilha de auditoria.
- Dados fictícios de demonstração e instruções de execução.

## Fora do MVP (explicitamente)

- Pagamentos reais, split e repasse de dinheiro a criadores, emissão de nota fiscal.
- Envio real de e-mail ou WhatsApp; integração com ERPs contábeis (Domínio, Alterdata etc.).
- Leitura de PDFs e imagens (OCR). O MVP usa documentos com texto extraído.
- Execução de código arbitrário gerado pela IA (o MVP compõe componentes conhecidos).
- Marketplace aberto a qualquer criador, avaliações públicas, busca avançada.
- Agendamento automático real. O gatilho mensal é simulado pelo botão "Executar agora"; a fila durável fica para o piloto ([agent-runtime.md](../technical/agent-runtime.md)).
- Autenticação de produção, SSO, recuperação de conta.
- Multi-idioma e outros nichos.
- Ferramenta de acesso a URLs externas: não é necessária no fluxo. Se surgir, exigirá lista de destinos permitidos ([security-and-permissions.md](../technical/security-and-permissions.md)).

## Critério de "pronto" desta etapa

- Fluxo J1–J5 navegável localmente.
- Testes automatizados aprovados para os controles críticos ([test-matrix.md](../test-matrix.md)).
- Documentação de execução no README.

**Pronto para demonstração local ≠ pronto para produção.** Os bloqueios de produção estão em [launch-requirements.md](../operations/launch-requirements.md).
