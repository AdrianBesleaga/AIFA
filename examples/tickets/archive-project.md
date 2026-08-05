# Feature: Archive Project

## Goal

Allow an authorized actor to archive one project.

## Input

- `projectId`: string - The project to archive.

## Output

- `projectId`: string - The archived project id.
- `archived`: boolean - Always `true` on success.

## Allowed Capabilities

- `project.load` - Load the project by id.
- `project.save` - Persist the archived project.
- `permission.check` - Confirm the actor can archive the project.
- `audit.record` - Record the archival action.

## Rules

- The project must exist.
- The actor must have `project.archive`.
- The actor must belong to the same organization as the project.
- Archiving an already archived project succeeds.

## Failure Cases

- `not_found` - The project does not exist.
- `not_allowed` - The actor cannot archive the project.

## Acceptance Tests

- Archives an active project.
- Returns success for an already archived project.
- Rejects an actor without archive permission.
- Returns `not_found` for a missing project.

