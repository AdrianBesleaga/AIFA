# AI Todo Assistant: AIFA Working Agreement

> **Required reading:** Follow [ARCHITECTURE.md](ARCHITECTURE.md) before adding or changing any code, feature definition, domain rule, capability, route, MCP tool, or slot contribution. It is the authoritative architecture document; this file is the contributor working agreement.

## Purpose

This app is a production-style demonstration of **AI Atomic Feature Architecture (AIFA)**.

AIFA treats a software feature as a small, explicit, independently implementable contract. A feature receives one context object containing its input, actor, metadata, and explicitly granted capabilities. It must not import infrastructure directly. The runtime owns infrastructure such as databases, authentication, logging, and transactions.

The goal is to make a feature understandable and safely changeable without requiring a contributor to learn the entire codebase first.

## Product Goal

Build a category-based AI todo assistant that demonstrates a full application can be assembled from small, isolated feature slices. Users describe what they want to achieve; AI proposes categorized tasks and can move their status through governed product operations. The architecture should feel like a puzzle:

- each piece has a clear purpose and contract;
- pieces can be developed and tested independently;
- pieces compose through explicit backend capabilities and frontend slots;
- humans and AI agents can work in parallel with minimal overlap and merge conflict;
- no feature relies on hidden conventions or direct infrastructure imports.

## Required Stack

- Node.js
- TypeScript
- MongoDB
- React
- Typed React slots for frontend extension points
- Material UI (MUI) for visual components and layout
- Model Context Protocol (MCP) server for external AI clients
- Ollama support through a provider-neutral AI capability

Use MUI components and its theme system. Do not create a bespoke CSS component system or add custom stylesheet-driven UI components. Small layout props and theme configuration are acceptable.

## Architecture Rules

### Enums over unstructured identifiers

Use TypeScript `enum`s for stable, closed sets of internal identifiers instead of repeating plain strings. This includes feature names, capability names, slot names, task categories/priorities/statuses, API error codes, and audit event types.

Do not introduce an enum for arbitrary user input, database IDs, free-form text, or values that must remain extensible. Convert external strings at the application boundary into the relevant enum before feature logic runs.

### Dynamic feature registration

Features register themselves through a feature-local manifest; core discovers and composes those manifests dynamically.

- Each feature exports one manifest from its own folder.
- A backend manifest declares its AIFA feature, route metadata, and capability requirements.
- A frontend manifest declares its slot contributions.
- An MCP manifest declares its feature-local tool metadata when the feature is safe to expose to MCP clients.
- Core contains generic discovery/registration mechanisms only; it must not maintain a hand-edited list of product features.
- Adding a feature should mean adding one feature folder, with no changes to a central registry unless a new shared capability or slot contract is genuinely required.

Use build-tool-supported module discovery on the frontend and a filesystem/module discovery adapter on the backend. Keep discovery deterministic and fail clearly for duplicate feature names, routes, or slot contribution names.

MCP tools must invoke the same discovered AIFA features as HTTP routes. They must never bypass feature validation, runtime capabilities, or auditing.

### Bounded contexts and feature slices

Product business rules live in bounded contexts under `contexts/<context-name>/`. Each context may contain `domain/` for context-specific entities, value objects, and invariants, plus `features/<feature-name>/` for application use cases.

This is the one intentional exception to the rule that implementation stays in a feature folder: shared business invariants belong to their bounded context, never in `core/` and never duplicated across features.

Each feature folder contains both:

- `backend/` — its AIFA feature definition, input/output contract, and feature-local tests.
- `frontend/` — its React slot contribution, view model, and feature-local UI tests where appropriate.

Examples: `contexts/task-management/features/create-task` and `contexts/ai-planning/features/generate-task-plan`.

A feature folder must include `feature.definition.json`. It is validated against `core/architecture/feature-definition.schema.json` and declares its business need, dependencies, consumed contracts, emitted events, route, capabilities, MCP exposure, slots, and implementation work items.

### Core

Only cross-cutting infrastructure belongs in `core/`:

- the AIFA runtime and shared result/feature types;
- MongoDB connection and capability adapters;
- HTTP server and route composition;
- shared domain types;
- React app shell, API transport, MUI theme, and slot registry.

Core must not contain product behavior that belongs to a feature slice.

### Dependency rules

- `core/` may not import a context or feature.
- A feature may import `core/`, its own bounded context's `domain/`, and itself only.
- A context may not import another context's domain or features directly.
- Cross-context work uses versioned contracts from `contexts/<context>/contracts/v<n>/` or domain events.
- Feature `dependsOn` declarations must form a directed acyclic graph.
- `dependsOn` may name only a feature whose published contract or persisted lifecycle artifact is required; it never authorizes imports or direct feature calls.
- CI runs JSON Schema validation, graph-cycle validation, and dependency-cruiser import rules before merge.

### Backend boundaries

- A feature may use only `context.input`, `context.actor`, `context.metadata`, `context.capabilities`, `context.ok`, and `context.fail`.
- Features must declare the capabilities they require.
- Features must not import MongoDB clients, HTTP objects, environment variables, or other feature implementations.
- Routes adapt HTTP to one feature invocation; they do not contain business logic.
- MongoDB access is exposed through runtime capabilities, never imported by a feature.
- Features must never receive, set, or infer a tenant identifier; runtime derives tenancy from the authenticated actor.
- Every mutation declares idempotency, actor, scope, and confirmation requirements in `feature.definition.json`.

### Frontend boundaries

- The app shell exposes named, typed slots and owns composition only.
- A feature renders UI by registering a contribution to a named slot.
- A slot model is an explicit contract between the app shell and a contribution.
- Feature UI must not reach into other feature folders or depend on app-shell internals.

## Contribution Checklist

Before considering a feature complete:

1. Define or update its explicit input, output, error, and capability contract.
2. Implement the backend behavior in the feature folder only.
3. Add its frontend contribution in the same feature folder.
4. Add focused behavioral tests that run the feature through the AIFA runtime.
5. Verify the feature can be understood without reading unrelated features.
6. Keep shared changes small and intentional; do not move feature behavior into `core/` for convenience.
7. Add or update authorization, tenant-isolation, idempotency, and concurrency tests for a mutation.
