# AI Atomic Feature Architecture

AI Atomic Feature Architecture, or AIFA, is an experiment in making software systems from small, explicit, independently implementable features.

The core question:

> Can a developer or AI agent implement one feature without needing to understand the whole project?

AIFA tries to make the answer "yes" by turning each feature into a self-contained contract.

## The Idea

Most codebases ask contributors to learn the surrounding system before they can safely change it. AIFA moves that knowledge into a runtime contract:

- A feature receives one `context` object.
- The context contains input, actor, metadata, and allowed capabilities.
- The feature cannot import infrastructure directly.
- The runtime owns databases, queues, auth, logs, and transactions.
- A ticket describes the feature contract before implementation begins.

```txt
Ticket Contract
      |
      v
Feature(input, capabilities)
      |
      v
Runtime-owned infrastructure
```

## Repository Contents

- `src/runtime/feature.js` defines the feature contract.
- `src/runtime/memoryRuntime.js` provides a tiny in-memory runtime.
- `src/features/archiveProject.js` is an atomic feature.
- `src/demo.js` runs the PoC end to end.
- `test/archiveProject.test.js` verifies the feature through the runtime.
- `docs/architecture.md` explains the architectural model.
- `docs/ticket-contract.md` defines the ticket format.
- `docs/research-plan.md` proposes how to evaluate the idea.
- `examples/tickets/archive-project.md` shows one complete feature ticket.

## Run The PoC

Requires Node.js 20 or newer.

```sh
npm test
npm run demo
```

Expected demo output:

```json
{
  "ok": true,
  "value": {
    "projectId": "project-1",
    "archived": true
  }
}
```

## What Makes A Feature Atomic?

An AIFA feature should:

1. Have one responsibility.
2. Declare its input and output.
3. Declare the capabilities it needs.
4. Use only the provided context.
5. Return explicit success or failure results.
6. Be testable without the real application.

## Why This Matters

This architecture optimizes for delegatable work. A small ticket can be handed to a human developer or an AI agent with a clear contract and minimal hidden context.

The long-term goal is not just smaller tasks. It is software that is designed so small tasks are safe, understandable, testable, and composable by default.
