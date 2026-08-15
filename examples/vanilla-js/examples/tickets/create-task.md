# Feature: Create Task

## Goal

Allow an actor to create one active task.

## Input

- `title`: string - The task title.

## Output

- `task`: Task - The created task.

## Allowed Capabilities

- `id.create` - Generate a task id.
- `clock.now` - Timestamp the task.
- `task.create` - Persist the task.
- `audit.record` - Record the creation event.

## Rules

- The title must not be empty after trimming.
- New tasks start as incomplete.
- New tasks have no completion timestamp.

## Failure Cases

- `invalid_title` - The title is empty.

## Acceptance Tests

- Creates an active task.
- Trims the provided title.
- Rejects an empty title.

