# Feature: Complete Task

## Goal

Allow an actor to complete one existing task.

## Input

- `taskId`: string - The task to complete.

## Output

- `task`: Task - The completed task.

## Allowed Capabilities

- `clock.now` - Timestamp completion.
- `task.load` - Load the existing task.
- `task.save` - Persist the completed task.
- `audit.record` - Record the completion event.

## Rules

- The task must exist.
- Completing an already completed task succeeds without changing it.
- Completing an active task sets `completed` to `true`.
- Completing an active task sets `completedAt`.

## Failure Cases

- `not_found` - The task does not exist.

## Acceptance Tests

- Completes an active task.
- Returns success for an already completed task.
- Returns `not_found` for a missing task.
