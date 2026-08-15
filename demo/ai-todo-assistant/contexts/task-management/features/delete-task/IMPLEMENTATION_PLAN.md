# Delete Task Feature Plan

## Goal

Permanently remove one task when the user confirms the action.

## Business Need

Users need to remove incorrect, duplicated, or no-longer-relevant commitments so the assistant remains useful rather than becoming another source of noise. Explicit confirmation protects against accidental or over-eager AI deletion.

## Manifest

- `FeatureName.DeleteTask`
- `HttpMethod.Delete /api/tasks/:taskId`
- frontend contribution: `SlotName.TaskRowActions`, name `delete-task-action`

## Backend Contract

Input: `{ taskId: string }`.

Success output: `{ deleted: true }`.

Failures: `ApiErrorCode.NotFound`.

Declared capabilities: `CapabilityName.TaskLoad`, `CapabilityName.TaskDelete`, and `CapabilityName.AuditRecord`.

The feature checks existence before deletion so it can return a meaningful enum-based failure. It records `AuditEventType.TaskDeleted`.

## Frontend Contribution

Render an MUI destructive `IconButton`. Confirmation uses MUI `Dialog`; confirmed deletion calls only this feature route and refreshes the task list.

## Tests

- deletes an existing task;
- returns `NotFound` without deleting anything for an unknown ID;
- records `TaskDeleted`;
- requires UI confirmation before the API call.
