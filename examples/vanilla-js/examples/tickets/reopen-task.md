# Feature: Reopen Task

## Goal

Allow an actor to reopen one completed task.

## Input

- `taskId`: string - The task to reopen.

## Output

- `task`: Task - The reopened task.

## Allowed Capabilities

- `task.load` - Load the existing task.
- `task.save` - Persist the reopened task.
- `audit.record` - Record the reopen event.

## Rules

- The task must exist.
- Reopening an active task succeeds without changing it.
- Reopening a completed task sets `completed` to `false`.
- Reopening a completed task clears `completedAt`.

## Failure Cases

- `not_found` - The task does not exist.

## Acceptance Tests

- Reopens a completed task.
- Returns success for an active task.
- Returns `not_found` for a missing task.

