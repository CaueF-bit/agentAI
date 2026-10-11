# Registro de decisões

Formato: data, decisão, motivo, alternativas consideradas. Inclui também toda correção de expectativa de teste (CLAUDE.md §2), com a justificativa de por que o requisito estava errado.

## 2026-10-11 — Regras do projeto centralizadas em CLAUDE.md

- **Decisão:** `CLAUDE.md` é a fonte única das regras; `AGENTS.md` aponta para ele; `docs/` guarda só registros vivos (matriz, decisões, riscos, checklist).
- **Motivo:** evitar duplicação e divergência entre arquivos.
- **Alternativas:** regras espalhadas em vários documentos por tema (descartado: risco de versões conflitantes).

## Pendentes de decisão

- Nicho de atuação.
- Stack (framework, banco, autenticação, provedor de pagamentos, provedor de IA).
- Infraestrutura para execuções longas de agentes.
- Regra para execuções em andamento ao pausar um agente (OBR-13).
- Quais ações de agentes exigem aprovação humana.
