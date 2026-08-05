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
- `docs/index.html` is a GitHub Pages presentation site.
- `examples/tickets/archive-project.md` shows one complete feature ticket.

## GitHub Pages

This repository includes a static presentation page in `docs/`.

Enable it in GitHub:

1. Open repository settings.
2. Go to Pages.
3. Set source to `Deploy from a branch`.
4. Select `main` and `/docs`.

The site will be available at:

```txt
https://adrianbesleaga.github.io/AIFA/
```

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

## Why Ordinary Small Tickets Are Not Enough

A ticket can look small while still hiding a lot of context.

```md
Allow users to archive a project.
```

To implement that safely, a developer or AI agent may still need to discover:

- where project logic lives
- how permissions work
- whether archived projects are soft-deleted
- whether audit events are required
- which persistence abstraction is used
- what response shape the app expects
- which tests prove the behavior

AIFA tries to make the hidden context explicit.

## Example AIFA Ticket

```md
# Feature: Archive Project

## Goal

Allow an authorized actor to archive one project.

## Input

- projectId: string - The project to archive.

## Output

- projectId: string - The archived project id.
- archived: boolean - Always true on success.

## Allowed Capabilities

- project.load - Load the project by id.
- project.save - Persist the archived project.
- permission.check - Confirm the actor can archive the project.
- audit.record - Record the archival action.

## Rules

- The project must exist.
- The actor must have project.archive.
- The actor must belong to the same organization as the project.
- Archiving an already archived project succeeds.

## Failure Cases

- not_found - The project does not exist.
- not_allowed - The actor cannot archive the project.

## Acceptance Tests

- Archives an active project.
- Returns success for an already archived project.
- Rejects an actor without archive permission.
- Returns not_found for a missing project.
```

This ticket is not just a task description. It is a contract.

The AI agent does not need to inspect the whole codebase to discover the feature boundary. The boundary is already written down.

## Example Implementation

The matching feature only uses the context and the capabilities declared in the ticket.

```js
export const archiveProject = defineFeature({
  name: "archive-project",
  description: "Archive one project when the actor has permission.",
  input: {
    projectId: "string",
  },
  output: {
    projectId: "string",
    archived: "boolean",
  },
  capabilities: ["project.load", "project.save", "permission.check", "audit.record"],

  async execute(context) {
    const project = await context.capabilities["project.load"]({
      projectId: context.input.projectId,
    });

    if (!project) {
      return context.fail("not_found", "Project was not found", {
        projectId: context.input.projectId,
      });
    }

    const allowed = await context.capabilities["permission.check"]({
      actor: context.actor,
      permission: "project.archive",
      resource: project,
    });

    if (!allowed) {
      return context.fail("not_allowed", "Actor cannot archive this project", {
        projectId: project.id,
      });
    }

    if (!project.archived) {
      await context.capabilities["project.save"]({
        project: {
          ...project,
          archived: true,
        },
      });
    }

    await context.capabilities["audit.record"]({
      type: "project.archived",
      actorId: context.actor.id,
      projectId: project.id,
    });

    return context.ok({
      projectId: project.id,
      archived: true,
    });
  },
});
```

Notice what is missing:

- no database import
- no framework import
- no service container
- no global config
- no hidden repository convention
- no unrelated project knowledge

The runtime owns infrastructure. The feature owns behavior.

## Why This Is Useful

AIFA is useful because it changes what needs to be understood before work can start.

Traditional feature work:

```txt
Read ticket
Explore codebase
Infer architecture
Find dependencies
Guess conventions
Implement
Patch tests
Review for accidental coupling
```

AIFA feature work:

```txt
Read ticket contract
Read runtime contract
Implement one feature
Run behavioral tests
```

This makes small tasks more suitable for:

- AI coding agents
- new contributors
- parallel development
- focused code review
- safer refactoring
- implementation from specs

## Why This Matters

This architecture optimizes for delegatable work. A small ticket can be handed to a human developer or an AI agent with a clear contract and minimal hidden context.

The long-term goal is not just smaller tasks. It is software that is designed so small tasks are safe, understandable, testable, and composable by default.
