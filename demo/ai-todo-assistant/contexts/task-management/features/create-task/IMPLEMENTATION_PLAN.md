# Create Task Feature Plan

## Goal

Create one Todo task from a user-provided title and priority.

## Business Need

People need a fast, trustworthy way to capture an obligation in the correct life area. This feature is the controlled endpoint used by both humans and AI after a suggestion is accepted, ensuring every created task has an explicit category, priority, and audit record.

## Manifest

- `FeatureName.CreateTask`
- `HttpMethod.Post /api/tasks`
- frontend contribution: `SlotName.TaskComposer`, name `create-task-form`

## Backend Contract

Input: `{ title: string; category: TaskCategory; priority: TaskPriority }`.

Success output: `{ task: Task }`.

Failures: `ApiErrorCode.InvalidInput` for a blank title.

Declared capabilities: `CapabilityName.TaskCreate`, `CapabilityName.IdCreate`, `CapabilityName.ClockNow`, and `CapabilityName.AuditRecord`.

Implementation trims the title, creates a `Task` with `TaskStatus.Todo`, persists it through `TaskCreate`, then records `AuditEventType.TaskCreated`.

## Frontend Contribution

Render an MUI `TextField`, category `Select`, priority `Select`, and `Button` in the `TaskComposer` slot. Options are derived from `TaskCategory` and `TaskPriority`. Submit calls this feature’s route, refreshes the shared task query model, and presents errors through MUI `Alert`.

## Tests

- creates a Todo task with each `TaskPriority` enum value;
- trims a valid title;
- rejects a blank title;
- records `TaskCreated`;
- renders the typed slot contribution.
