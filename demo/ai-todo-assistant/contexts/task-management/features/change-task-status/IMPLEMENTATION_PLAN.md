# Change Task Status Feature Plan

## Goal

Move a task between `TaskStatus.Todo`, `TaskStatus.InProgress`, and `TaskStatus.Completed` through one explicit, auditable business operation.

## Business Need

An assistant is only useful if the list stays current. Users need to tell an AI “I started this” or “I finished that” and trust that the resulting ticket state is valid, visible, and recorded. A single status-transition feature gives the web app, MCP clients, and Ollama-assisted workflows the same controlled operation.

## Manifest

- `FeatureName.ChangeTaskStatus`
- `HttpMethod.Patch /api/tasks/:taskId/status`
- MCP tool: `change_task_status`
- frontend contribution: `SlotName.TaskRowActions`, name `change-task-status-action`

## Backend Contract

Input: `{ taskId: string; status: TaskStatus }`.

Success output: `{ task: Task }` with the requested enum status.

Failures: `ApiErrorCode.NotFound` and `ApiErrorCode.InvalidStatusTransition`.

Declared capabilities: `CapabilityName.TaskLoad`, `CapabilityName.TaskSave`, `CapabilityName.ClockNow`, and `CapabilityName.AuditRecord`.

The feature validates all transitions before saving. Moving to `Completed` sets `completedAt`; moving from `Completed` clears it. Repeating the current status succeeds without a duplicate audit event. A changed state writes the matching `AuditEventType`.

The web UI may expose Complete and Reopen controls, but they are presentation conveniences that submit this feature’s `TaskStatus.Completed` or `TaskStatus.Todo` command. MCP clients use the same generic status-transition tool, including for `TaskStatus.InProgress`.

## Frontend Contribution

Render an MUI status `Select` or menu on each task row using `TaskStatus` enum values. The contribution calls this feature’s route and refreshes the shared task model. It must not mutate local task state directly.

## Tests

- moves a task through every supported `TaskStatus` transition;
- sets and clears `completedAt` correctly;
- accepts idempotent status requests without duplicate audit entries;
- returns `NotFound` for an unknown task;
- rejects invalid external strings before feature execution;
- exposes the same result through the HTTP route and MCP tool.
