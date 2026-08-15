# AIFA repository guidance

## Purpose

AIFA is a reference architecture for human and AI collaboration on full-stack software. Preserve its central invariant: a feature knows its purpose, contract, and declared capabilities, but not the whole application.

## Documentation precedence

1. For repository orientation, read [`README.md`](./README.md).
2. For the conceptual model, read [`docs/architecture.md`](./docs/architecture.md).
3. Before changing the demo, read [`demo/ai-todo-assistant/AGENTS.md`](./demo/ai-todo-assistant/AGENTS.md).
4. For demo implementation decisions, [`demo/ai-todo-assistant/ARCHITECTURE.md`](./demo/ai-todo-assistant/ARCHITECTURE.md) is authoritative.

Rules in a more deeply nested `AGENTS.md` apply to files beneath that directory.

## Repository boundaries

- Keep general AIFA documentation in `README.md` and `docs/`.
- Keep product behavior in a bounded-context feature slice under `demo/ai-todo-assistant/contexts/`.
- Keep `demo/ai-todo-assistant/core/` generic; it must not own product behavior.
- Do not create direct imports between features or between bounded-context internals.
- Prefer machine-readable contracts and executable checks over undocumented conventions.

## Verification

For demo code changes, run from `demo/ai-todo-assistant/`:

```bash
npm run check
npm test
npm run build
```

For documentation-only changes, verify links, Mermaid syntax, terminology, and consistency with the authoritative architecture.
