# List Tasks Feature Plan

## Goal

Provide the task collection for the board and its summary slots.

## Business Need

Users need one reliable view of commitments across work, personal, sport, shopping, and other categories. This feature gives the web app and connected AI clients the same current, filterable source of truth.

## Manifest

- `FeatureName.ListTasks`
- `HttpMethod.Get /api/tasks`
- frontend contribution: `SlotName.TaskList`, name `task-list`
- frontend contribution: `SlotName.TaskSummary`, name `task-summary`

## Backend Contract

Input: `{ status?: TaskStatus; category?: TaskCategory }`.

Success output: `{ tasks: Task[] }` in newest-first creation order.

Declared capabilities: `CapabilityName.TaskList`.

The feature optionally filters by `TaskStatus` and `TaskCategory`; the MongoDB capability owns query construction and index usage.

## Frontend Contribution

Render the board using MUI `List`, `ListItem`, `Chip`, and `Typography`. The summary contribution uses MUI `Card` components to show active, completed, and priority counts. It consumes the typed task-list slot model only.

## Tests

- lists deterministic task order;
- filters by every `TaskStatus` enum value;
- returns an empty collection successfully;
- renders no task rows for an empty model;
- computes summary counts from typed tasks.
