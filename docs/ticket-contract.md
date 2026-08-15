# AIFA Feature Contract

An AIFA work item should contain enough explicit context to implement and verify one meaningful product behavior without exploring unrelated features.

In the [Focusly demo](../demo/ai-todo-assistant/README.md), the contract has two synchronized forms:

- `IMPLEMENTATION_PLAN.md` explains the intent, behavior, and acceptance criteria to a human or AI agent.
- `feature.definition.json` provides the machine-readable dependencies, schemas, capabilities, route, security rules, MCP exposure, UI slots, and work items that architecture checks can validate.

The colocated `manifest.ts` is the executable binding. It registers implemented backend, frontend, and MCP contributions; it is not a replacement for the planning contract.

## Template

```md
# Feature: <verb noun>

## Goal

Describe the single behavior this feature adds.

## Input

- field: type - description

## Output

- field: type - description

## Allowed Capabilities

- capability.name - why it is needed

## Rules

- Business rule 1
- Business rule 2

## Failure Cases

- code - when it happens

## Boundaries

- Bounded context and versioned contracts used
- HTTP route and whether the feature is exposed through MCP
- Frontend slots contributed to
- Actor, authorization, tenancy, idempotency, confirmation, and concurrency rules

## Events

- Versioned domain events emitted or consumed

## Acceptance Tests

- Observable behavior 1
- Observable behavior 2
```

## Quality Bar

A good ticket:

- describes one meaningful behavior;
- names explicit input, output, and typed failures;
- lists the minimum allowed capabilities;
- identifies its bounded context and public contracts;
- declares HTTP, MCP, and frontend composition points where applicable;
- makes authorization, tenancy, idempotency, confirmation, and concurrency requirements explicit;
- includes edge cases and observable acceptance tests;
- can be understood without project archaeology.

## Definition and implementation mapping

| Contract concern | Focusly location |
| --- | --- |
| Business purpose and work items | `IMPLEMENTATION_PLAN.md` and `feature.definition.json` |
| Input and output | `contracts/*.schema.json` |
| Executable registration | `manifest.ts` |
| Backend behavior | `backend/feature.ts` |
| Frontend contribution | `frontend/contribution.tsx` |
| Runtime permission | declared capability enums and runtime adapters |
| Completion signal | behavioral, boundary, and architecture tests |

See the implemented [Create Task feature](../demo/ai-todo-assistant/contexts/task-management/features/create-task/) for a complete slice.

## Anti-Patterns

Avoid tickets like:

- "Improve checkout"
- "Add notification support"
- "Update project logic"
- "Refactor permissions"

Prefer tickets like:

- "Create a tenant-scoped task with an idempotency key"
- "Move a task to an allowed status when its expected version matches"
- "Generate a reviewable task plan without creating tasks"
- "Delete a task only after explicit confirmation"
