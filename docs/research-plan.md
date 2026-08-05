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

## Phase 3: Reference Runtime

Build a small runtime that supports:

- feature registration
- input validation
- capability allowlists
- test runtime adapters
- production runtime adapters
- structured execution results
- audit trails

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
