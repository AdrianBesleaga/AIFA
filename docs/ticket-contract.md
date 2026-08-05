# Ticket Contract

An AIFA ticket should be small enough to implement without broader project knowledge.

## Template

```md
# Feature: <verb noun>

## Goal

Describe the single behavior this feature adds.

## Input

- field: type - description

## Output

- field: type - description

## Allowed Capabilities

- capability.name - why it is needed

## Rules

- Business rule 1
- Business rule 2

## Failure Cases

- code - when it happens

## Acceptance Tests

- Observable behavior 1
- Observable behavior 2
```

## Quality Bar

A good ticket:

- describes one feature
- names explicit input and output
- lists allowed capabilities
- includes edge cases
- defines observable acceptance tests
- avoids requiring project archaeology

## Anti-Patterns

Avoid tickets like:

- "Improve checkout"
- "Add notification support"
- "Update project logic"
- "Refactor permissions"

Prefer tickets like:

- "Archive a project"
- "Rename a project"
- "Send audit event after project archival"
- "Reject project archival when actor lacks permission"
