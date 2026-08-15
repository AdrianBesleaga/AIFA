# Feature: Delete Task

## Goal

Allow an actor to delete one existing task.

## Input

- `taskId`: string - The task to delete.

## Output

- `deleted`: boolean - Always `true` on success.

## Allowed Capabilities

- `task.load` - Confirm the task exists.
- `task.delete` - Delete the task.
- `audit.record` - Record the delete event.

## Rules

- The task must exist.
- Deleting a task removes it from subsequent list results.

## Failure Cases

- `not_found` - The task does not exist.

## Acceptance Tests

- Deletes an existing task.
- Returns `not_found` for a missing task.
