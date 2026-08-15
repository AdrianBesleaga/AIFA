# Generate Task Plan Feature Plan

## Goal

Turn a user goal into a persisted, reviewable task plan. This is the AI-assisted product capability and remains isolated from task persistence.

## Business Need

This is the core time-saving promise of the product: a user states an outcome instead of manually decomposing it into tickets. The feature lets local Ollama or any configured provider propose a categorized plan while keeping final acceptance and task creation under user control.

## Manifest

- `FeatureName.GenerateTaskPlan`
- `HttpMethod.Post /api/assistant/task-plan`
- frontend contribution: `SlotName.AssistantPanel`, name `generate-task-plan-panel`

## Backend Contract

Input: `{ goal: string; category: TaskCategory; priority: TaskPriority }`.

Success output: `{ suggestions: TaskSuggestion[] }`, where each suggestion has title, `TaskCategory`, enum priority, and rationale.

Failures: `ApiErrorCode.InvalidInput`, `ApiErrorCode.AssistantUnavailable`, and `ApiErrorCode.AssistantResponseInvalid`.

Declared capabilities: `CapabilityName.AssistantGenerateTaskPlan` and `CapabilityName.AuditRecord`.

The feature validates the goal, calls the provider-neutral capability, validates and normalizes its result into enums, persists a tenant-owned `TaskPlan` review record, and records `AuditEventType.TaskPlanGenerated`. It never imports an AI SDK or creates tasks itself.

## Frontend Contribution

Render an MUI `TextField`, priority selector, and generation button in `AssistantPanel`. Render suggestions in MUI `Card` components. Each accepted suggestion invokes the create-task route; this keeps creation inside the Create Task feature.

## Tests

- rejects a blank goal;
- normalizes generated priority values to `TaskPriority`;
- returns provider failures as `AssistantUnavailable`;
- does not persist tasks directly;
- accepts one suggestion through the Create Task API boundary.
