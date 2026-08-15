# AIFA Architecture

AI Atomic Feature Architecture (AIFA) organizes an application around small feature contracts instead of framework layers. A feature owns one product behavior; the runtime owns infrastructure and composition.

This document explains the model. The [Focusly architecture](../demo/ai-todo-assistant/ARCHITECTURE.md) is the authoritative description of the production-style implementation in this repository.

## The design goal

A contributor should be able to implement or change one feature by reading its contract, its bounded-context rules, and the runtime interface—not the whole codebase.

```text
Feature definition + schemas
             │
             ▼
      Discovered manifest
             │
      ┌──────┴──────┐
      ▼             ▼
 HTTP / MCP     React UI slot
      │             │
      └──────┬──────┘
             ▼
       AIFA runtime
             │
             ▼
 Granted capabilities → infrastructure
```

## The three boundaries

### 1. Feature contract

A feature declares its:

- business purpose and bounded context;
- input, output, and typed failures;
- required runtime capabilities;
- HTTP route and optional MCP tool;
- frontend slot contributions;
- security, idempotency, confirmation, and event requirements;
- acceptance criteria and tests.

In the demo, `feature.definition.json` is the machine-readable planning contract, JSON Schemas define boundary data, and `manifest.ts` binds the declaration to executable backend and frontend code.

### 2. Runtime context

The runtime constructs the complete world visible to backend feature logic:

- `input` — validated feature input;
- `actor` — authenticated user or system identity;
- `metadata` — request and execution metadata;
- `capabilities` — only the operations declared by the feature;
- `ok` and `fail` — structured result helpers.

Capabilities are narrow permissions such as saving a task, generating a plan, or recording an audit event. They are not database clients, HTTP objects, SDKs, or general-purpose service containers.

### 3. Bounded context

Related business language and invariants live together under `contexts/<context>/`. Feature slices may use their own context’s domain rules, but they may not import another feature or another context’s internal domain. Cross-context communication uses versioned contracts or domain events.

## Backend flow

Both browser requests and AI clients use the same feature boundary:

```text
HTTP request or MCP tool
  → dynamic discovery
  → authentication and authorization
  → input schema validation
  → idempotency and transaction boundary
  → feature execution
  → declared capabilities
  → MongoDB, AI provider, audit, and outbox adapters
```

The feature contains business behavior but has no direct infrastructure imports. The runtime can therefore enforce tenant scope, permissions, concurrency, auditing, and capability access consistently regardless of entry point.

### Backend rules

1. A feature uses only values on its runtime context.
2. Infrastructure is accessed only through declared capabilities.
3. HTTP and MCP adapters contain translation, not business logic.
4. Routes and tools invoke the same discovered feature implementation.
5. Mutations declare authorization, idempotency, confirmation, and concurrency behavior.
6. Cross-context work uses public, versioned contracts or events.

## Frontend flow

The frontend applies the same composition model:

```text
React app shell
  → discovers feature manifests
  → registers typed contributions
  → renders named UI slots
  → feature-local hooks call HTTP contracts
  → shared query runtime caches server state
  → semantic tags and domain events invalidate affected data
```

The app shell owns layout, authentication-aware transport, shared query infrastructure, event transport, theme, and slot definitions. Each feature owns the component and hooks for its behavior.

A Create Task contribution does not import the task list or tell it to refresh. After success it invalidates a stable Task Collection tag. Every independent contribution that reads that resource updates through the generic query runtime.

### Frontend rules

1. Feature UI contributes through named, typed slots.
2. A feature does not import another feature’s component or hook.
3. Components own transient presentation state; the query runtime owns server state.
4. Feature-local hooks adapt one feature contract to React.
5. Synchronization uses semantic resource tags and versioned domain events, not component-to-component commands.
6. Core provides generic composition and never contains product behavior.

## Dependency direction

```text
core                    → core only
context domain          → core + its own domain
feature                 → core + itself + own domain + versioned contracts
HTTP / MCP / UI adapter → core + its registered feature contract
cross-context work      → versioned contracts or domain events
```

Forbidden dependencies include:

- core importing a product context or feature;
- one feature importing another feature;
- one context importing another context’s internal domain;
- features importing MongoDB, HTTP, MCP, environment, or AI-provider SDKs;
- circular imports or hand-maintained central feature registries.

## How the boundaries are enforced

AIFA relies on executable checks, not documentation alone:

- JSON Schema validation for feature definitions and boundary data;
- generated TypeScript types from schemas;
- deterministic dynamic discovery with duplicate detection;
- dependency graph and import-boundary validation;
- runtime denial of undeclared capabilities;
- behavioral tests through the AIFA runtime;
- HTTP/MCP parity, authorization, tenancy, concurrency, and integration tests.

## Tradeoffs

AIFA moves design work toward contracts, capabilities, and composition. Poorly chosen capabilities can become noisy or too broad, and not every line of code should become its own feature. The useful unit is the smallest meaningful product behavior that can be specified, implemented, and verified independently.

The architecture pays off when a growing system needs parallel work, clear review boundaries, multiple entry points, or safe delegation to AI agents.

## Explore the implementation

- [Focusly product and setup](../demo/ai-todo-assistant/README.md)
- [Full implementation architecture](../demo/ai-todo-assistant/ARCHITECTURE.md)
- [Contributor working agreement](../demo/ai-todo-assistant/AGENTS.md)
- [Feature ticket contract](./ticket-contract.md)
- [Repository overview](../README.md)
