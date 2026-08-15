# Feature: Create Task

## Goal

Allow an actor to create one active task from the React UI.

## Input

- `title`: string - The task title.
- `priority`: `low | medium | high` - Optional task priority.

## Output

- `task`: Task - The created task.

## Allowed Capabilities

- `id.create` - Generate a task id.
- `clock.now` - Timestamp the task.
- `task.create` - Persist the task.
- `audit.record` - Record the creation event.

## Rules

- The title must not be empty after trimming.
- Missing or invalid priority becomes `medium`.
- New tasks start as incomplete.
- New tasks have no completion timestamp.

## Failure Cases

- `invalid_title` - The title is empty.

## Acceptance Tests

- Creates an active task.
- Trims the title.
- Defaults unknown priority to `medium`.
- Rejects empty titles.

