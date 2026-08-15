# Research Plan

AIFA should be treated as both an architecture experiment and a work decomposition experiment.

## Research Question

Can software systems be designed so AI-implementable feature work is isolated by default?

## Hypothesis

If features are implemented only through explicit context contracts and runtime capabilities, then developers and AI agents can complete small feature tasks with less repository context, fewer unrelated edits, and more predictable tests.

## Phase 1: Literature Review

Compare AIFA with:

- Vertical Slice Architecture
- Hexagonal Architecture
- Clean Architecture
- CQRS
- Actor Model
- Capability-based security
- Plugin architectures
- Functional core, imperative shell

## Phase 2: Formal Model

Define:

- feature
- context
- capability
- runtime
- ticket contract
- result
- event
- boundary

## Phase 3: Reference Application

Use [Focusly](../demo/ai-todo-assistant/README.md) as the production-style reference application. It currently demonstrates:

- dynamic backend, frontend, and MCP feature registration;
- JSON Schema validation and generated contract types;
- capability allowlists and runtime adapters;
- typed execution results;
- tenant-scoped persistence, authorization, audit, idempotency, and outbox behavior;
- typed React slot composition and feature-local hooks;
- architecture, behavioral, boundary, and integration tests.

## Phase 4: Evaluation

Measure:

- implementation time
- required context size
- number of files touched
- review time
- defect rate
- test coverage
- AI success rate
- merge conflicts

## Phase 5: Case Studies

Apply the model to:

- CRUD workflows
- background jobs
- event handlers
- integrations
- frontend actions
- policy-heavy domain logic

## Success Criteria

AIFA is promising if small features can be implemented from the ticket contract plus runtime docs, without reading unrelated application code.
