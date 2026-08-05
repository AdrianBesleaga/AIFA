# Architecture

AI Atomic Feature Architecture separates feature behavior from application infrastructure so small tasks can be implemented by AI agents or humans without full project context.

## Core Concepts

### Feature

A feature is the smallest meaningful implementation unit. It performs one user-visible or domain-visible behavior.

A feature must define:

- `name`
- `description`
- `input`
- `output`
- `capabilities`
- `execute(context)`

### Context

The context is the complete world visible to the feature.

It contains:

- `input`: validated feature input
- `actor`: the user or system performing the action
- `metadata`: request or execution metadata
- `capabilities`: runtime-provided operations
- `ok(value)`: success result helper
- `fail(code, message, details)`: failure result helper

### Capability

A capability is an operation the runtime permits a feature to perform.

Examples:

- `project.load`
- `project.save`
- `permission.check`
- `audit.record`
- `event.publish`
- `email.send`

Capabilities are not repositories, services, SDKs, or framework objects. They are narrow permissions to perform explicit actions.

### Runtime

The runtime owns infrastructure.

It is responsible for:

- validating feature contracts
- constructing context objects
- exposing allowed capabilities
- hiding infrastructure details
- enforcing capability boundaries
- recording execution metadata

### Ticket Contract

The ticket contract is the human-facing version of the feature contract. It should provide enough information for implementation without requiring broad project knowledge.

## Dependency Direction

AIFA inverts the common dependency shape.

Traditional shape:

```txt
Feature -> Service -> Repository -> Database
```

AIFA shape:

```txt
Feature -> Context Capability -> Runtime -> Infrastructure
```

The feature knows the operation it is allowed to request. It does not know the implementation.

## Design Rules

1. Features do not import runtime infrastructure.
2. Features do not create database clients.
3. Features do not call external APIs directly.
4. Features do not read global config.
5. Features do not mutate shared global state.
6. Features only use declared capabilities.
7. Features return structured results.

## Intended Benefits

- Smaller implementation units
- Less hidden context
- Easier onboarding
- Safer AI-generated changes
- Focused tests
- Easier review
- Lower coupling between feature code and infrastructure

## Known Tradeoffs

AIFA moves complexity upstream. Someone still has to design the runtime, capabilities, and ticket contracts carefully.

It can also become restrictive if the capability model is too narrow or noisy. The goal is not to make every line of code isolated. The goal is to make feature implementation isolated enough to be safely delegated.
