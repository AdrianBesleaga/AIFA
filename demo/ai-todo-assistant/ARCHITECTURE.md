# AI Todo Assistant Architecture

## Purpose

AI Todo Assistant is a category-based task-management product. A person describes an outcome in natural language; an AI proposes categorized tasks and can update task status through the same governed operations available to the web application.

The application demonstrates AI Atomic Feature Architecture (AIFA): software is built from small, explicit, independently understandable feature slices. This lets humans and AI agents work concurrently with minimal hidden context and merge conflict.

See [BUSINESS.md](BUSINESS.md) for the customer problem and product goals.

## Architectural Principles

1. **A feature is a contract.** It declares input, output, failures, capabilities, HTTP/MCP exposure, frontend slots, and technical work items.
2. **Infrastructure is runtime-owned.** Features receive capabilities; they never import MongoDB, HTTP, environment configuration, AI SDKs, or other feature implementations.
3. **Business rules stay in their bounded context.** Core is platform infrastructure, never a dumping ground for task or AI-planning behavior.
4. **Composition is dynamic.** Feature definitions and manifests are discovered rather than registered in hand-edited central lists.
5. **Identifiers are typed.** Stable internal values use TypeScript enums, including feature names, capabilities, slots, categories, priorities, statuses, error codes, audit events, and HTTP methods.
6. **Every boundary is enforced.** Schema validation, dependency analysis, behavioral tests, and runtime capability checks run before a feature is accepted.

## Technology Stack

- Node.js and TypeScript
- MongoDB
- React and Material UI (MUI)
- Typed React slots
- Model Context Protocol (MCP) server
- Ollama through a provider-neutral AI capability

MUI is the visual component system. Do not create a parallel custom CSS component library.

## Structure

```txt
demo/ai-todo-assistant/
  core/                         # platform/composition only
    shared/                      # contracts, enums, result types
    backend/                     # runtime, MongoDB, HTTP, MCP, discovery
    frontend/                    # app shell, slots, API, theme, discovery
    architecture/                # schema, dependency policy, validators
  contexts/
    task-management/
      domain/                    # Task invariants and value objects
      features/
        create-task/
        accept-task-suggestion/
        list-tasks/
        change-task-status/
        delete-task/
    ai-planning/
      domain/                    # AI-planning concepts and validation
      features/
        generate-task-plan/
  BUSINESS.md
  AGENTS.md
  ARCHITECTURE.md
```

## Core

`core/` owns generic composition and adapters only:

- AIFA runtime and `FeatureContext` contracts;
- MongoDB client, repositories, audit/outbox infrastructure, and runtime capability adapters;
- dynamic backend route and MCP-tool registration;
- React shell, typed slot registry, Vite manifest discovery, MUI theme, and API transport;
- shared enum and contract definitions;
- architecture validators.

Core must not implement task creation, status transitions, AI task planning, or any other product behavior.

## Bounded Contexts

A bounded context owns its business language, entities, value objects, and invariants.

### Task Management

Owns `Task`, `TaskCategory`, `TaskPriority`, and `TaskStatus`. Initial categories are Work, Personal, Sport, Shopping, and Other. Initial statuses are Todo, InProgress, and Completed.

The task-status transition invariant lives here. Features invoke it; they do not duplicate it.

`Task` also has an integer `version`. Every mutation requires the version observed by the caller and performs an optimistic-concurrency update. A stale write returns `ApiErrorCode.VersionConflict` with the current task representation.

### AI Planning

Owns the persisted `TaskPlan` aggregate, validated task-plan suggestions, and the rules for safely turning provider output into task categories and priorities. Generating a plan creates a tenant-owned review record and emits `TaskPlanGeneratedV1`; it does not create tasks. The independent Task Management `accept-task-suggestion` feature consumes the published suggestion contract and contributes its action through the typed `TaskSuggestionActions` slot. AI Planning therefore does not know an acceptance route or import another feature's hook.

Contexts do not import each other’s domain or feature modules. They communicate using versioned contracts or domain events.

`contexts/<context>/contracts/v<n>/` is the published-language boundary. It contains JSON Schemas and generated TypeScript types that other contexts may consume. For example, AI Planning may consume `task-management/contracts/v1/task-taxonomy.schema.json`; it must not import Task Management’s domain module. Every cross-context contract is versioned, backward-compatible within its major version, and owned by its publishing context.

## Security and Multi-Tenancy

Every request—HTTP, MCP, browser, or provider callback—must resolve to an `Actor` containing a `TenantId`, `UserId`, and enum-backed permission scopes. Anonymous mutation is prohibited.

Browser authentication uses an OpenID Connect authorization-code flow with PKCE. The browser requests the application scopes configured by `VITE_OIDC_SCOPES`; live event delivery additionally requires `EventRead`. The remote MCP endpoint uses Streamable HTTP and acts as an OAuth 2.1 protected resource: it validates bearer-token audience, expiry, tenant, user, and scopes on every request. A local stdio MCP connection obtains its credentials from the local environment and is restricted to the configured tenant. Token revocation, client registration, and scope assignment are owned by the identity adapter in core.

### Authorization Middleware

Authorization is a core HTTP middleware concern, never feature logic. `createAuthorizationMiddleware` runs after route discovery and before idempotency or feature execution. It resolves the actor once, returns `401 NotAuthorized` when no trusted actor is available, and returns `403 Forbidden` when the actor lacks any scope required by the executable feature manifest. Both HTTP request handlers use this middleware so local API routes and dynamically discovered routes cannot drift.

`feature.definition.json` declares each feature's `mcpScopes`; the colocated `manifest.ts` binds those enum-backed scopes to the executable route. This keeps the permission requirement visible in the machine-readable plan while allowing the runtime to enforce it without importing a feature's business code. Development-only `x-aifa-*` actor headers are disabled in production; production actors must come from a verified OIDC bearer token. The local stdio MCP bridge forwards its configured development actor or production bearer token through the same middleware.

Tasks, task plans, audits, idempotency records, and outbox events are tenant-owned. MongoDB capability adapters receive the actor and apply `tenantId` to every query and mutation; the feature never supplies or overrides a tenant ID. Required indexes include `{ tenantId, status, category }`, `{ tenantId, createdAt }`, and unique `{ tenantId, actorId, featureName, idempotencyKey }` for commands.

MongoDB must run as a replica set (or sharded cluster) in every environment that enables multi-document mutations, including integration tests. This is required for the task mutation, audit, idempotency record, and outbox event to commit atomically.

MCP authentication maps each client connection to an actor and only exposes tools permitted by its scopes. Feature definitions declare whether a tool is exposed, its required scope enum, whether it mutates data, and whether it requires confirmation. Deletion always requires confirmation; status changes require an explicit user instruction.

## Command Safety and Concurrency

Every mutation has a caller-supplied idempotency key and expected task version where relevant. The idempotency store atomically claims a key before feature execution, records a fenced execution identifier, and persists the command result on completion. A bounded lease lets a retry recover from a crashed worker without allowing an earlier execution to overwrite the recovered result. HTTP or MCP retries return the original completed result without repeating persistence or audit work.

Browser command hooks allocate one command identifier for each user intent. A successful response or
a definitive HTTP failure settles that identifier; an unknown transport outcome retains it so a
retry replays the same durable command instead of creating a duplicate task or plan.

Features use typed failures for `VersionConflict`, `IdempotencyKeyReuse`, `NotAuthorized`, and `ConfirmationRequired`. These failures are part of each adapter contract, not raw infrastructure errors.

## Events, Audit, and Outbox

Within the MongoDB transaction for a successful mutation, the runtime writes the task change, audit event, and an outbox event. Initial versioned event contracts are:

- `TaskCreatedV1`
- `TaskStatusChangedV1`
- `TaskDeletedV1`
- `TaskPlanGeneratedV1`

An outbox publisher delivers events asynchronously and records delivery state. The authenticated
`/api/events` SSE boundary also reads the tenant's committed outbox records in event order for live
browser synchronization. Opaque cursors allow reconnects to resume without relying on browser
cookies or exposing tenant identity in the request. Consumers receive versioned event contracts,
never direct imports from another context. This preserves reliability without coupling feature
implementations.

## Feature Slice Contract

Each feature lives at `contexts/<context>/features/<feature-name>/` and contains:

```txt
<feature-name>/
  feature.definition.json        # machine-readable technical work contract
  manifest.ts                    # executable backend/frontend/MCP registration
  backend/                       # AIFA feature, mapper, focused tests
  frontend/                      # slot contribution, view model, focused tests
  IMPLEMENTATION_PLAN.md         # human-readable implementation guide
```

`feature.definition.json` is validated against `core/architecture/feature-definition.schema.json`. It includes:

- business need;
- bounded context and feature name;
- feature dependencies;
- HTTP route and method;
- required capabilities;
- MCP exposure and tool name;
- frontend slots;
- mutation, actor, idempotency, confirmation, and MCP-scope requirements;
- technical work items with acceptance criteria.

Each executable input/output/MCP-tool/event shape has a colocated JSON Schema. `npm run generate:contracts` generates TypeScript types from those schemas; adapters validate untrusted data with Ajv plus format support before it reaches a feature. A feature definition references its input and output schemas, preventing contracts from drifting between JSON, HTTP, MCP, and TypeScript.

The definition is the planning contract; `manifest.ts` is the executable binding. Neither replaces the other.

## Dynamic Registration

Backend discovery scans `contexts/*/features/*/feature.definition.json`, validates definitions and the dependency graph, then imports each matching `manifest.ts` in deterministic enum order.

`dependsOn` means a feature requires another feature’s **published, versioned contract or persisted lifecycle artifact** to be available; it never permits an import or direct feature call. `consumesContracts` names the exact public schemas involved. Both are correctly empty for independent task commands. They become non-empty, for example, if a future `approve-generated-plan` feature consumes the persisted `TaskPlanGeneratedV1` contract published by Generate Task Plan.

Frontend discovery uses Vite `import.meta.glob` to load feature manifests and register typed slot contributions in deterministic order.

MCP discovery loads only manifest-declared tools. Each tool calls the same AIFA feature as the HTTP route, so MCP clients cannot bypass validation, authorization, capability checks, or audit records.

## Frontend State, Hooks, and Event Synchronization

Frontend composition follows the same dependency direction as the backend. Slots compose visual
contributions, feature-local hooks adapt one feature contract to React, and a runtime-owned query
cache synchronizes server-owned state. A feature must not import another feature, call another
feature's hook, hold a reference to another feature's component, or emit an imperative UI event
such as `RefreshTaskCount`.

Frontend feature code may import generic frontend infrastructure from `core/`, its own feature,
its bounded context's domain, and versioned contracts published by a bounded context. A versioned
frontend contract may define read models, query inputs, and stable cache tags, but it must not
contain React components, hooks, API calls, or feature orchestration.

### Responsibilities

- **Components** render a slot contribution and own only transient presentation state such as an
  open menu, draft field value, or selected tab.
- **Feature-local query hooks** read one published read model and expose loading, success, empty,
  and typed failure states to that feature's components.
- **Feature-local command hooks** invoke one feature boundary and own command state keyed by
  operation and, where relevant, entity ID.
- **Core frontend infrastructure** owns generic query caching, request deduplication, cancellation,
  retries, authentication-aware transport, event transport, and provider lifecycle. Core must not
  know task, plan, settings, or other product-specific cache keys or event reactions.
- **Versioned bounded-context frontend contracts** define stable read models, query inputs, and
  enum-backed cache tags shared by independent feature consumers. They contain no behavior.
- **Frontend domain-event consumers** validate a published event contract and translate that fact
  into semantic cache invalidation. They never target a component or call a feature directly. Each
  consumer belongs to a feature slice, declares the consumed event schema in `consumesContracts`,
  and registers through that feature's discovered frontend manifest; core keeps no hand-written
  product-event registry.

The application installs the generic query and event providers above the app shell so slot
contributions in the header, navigation, content, footer, or future surfaces observe the same
tenant-scoped cache. Cache entries and event subscriptions are scoped by the authenticated actor
and tenant and are cleared when that identity changes or signs out.

### Semantic Invalidation

Commands and events coordinate through semantic resource tags rather than component names. For
example, Task Management may publish a versioned `TaskCollection` cache tag. List, board, summary,
and count queries that depend on the task collection associate their cache entries with that tag.
Create, status-change, and delete command hooks invalidate the tag only after an explicit successful
result. The query runtime then marks every dependent entry stale, deduplicates refetches, and
rerenders subscribed contributions.

Consequently, a Create Task contribution does not know that a task-count contribution exists. Both
depend only on the published Task Management frontend contract and generic core query runtime:

```txt
Create Task component
  -> feature-local create command hook
  -> successful Create Task result
  -> invalidate TaskCollection
  -> generic query cache
  -> subscribed task list, board, summary, and count queries update
```

Mutation responses are the immediate synchronization mechanism for commands issued in the current
browser. The successful command hook invalidates affected tags without waiting for the durable
outbox event to return to that browser.

Tasks may also be created by MCP clients, another browser, another actor, or background processing.
For those cases, the generic core authenticated-fetch SSE adapter delivers validated versioned domain events
to dynamically registered frontend event consumers. A Task Management consumer maps
`TaskCreatedV1`, `TaskStatusChangedV1`, and `TaskDeletedV1` to the same `TaskCollection`
invalidation. Receiving both the local-success invalidation and its later domain event is expected;
invalidation must be idempotent and refetches deduplicated.

Published events are facts, not client state containers. When an event contains only an aggregate
identifier, consumers invalidate and refetch the authoritative read model rather than constructing
a partial cache entry. Direct cache updates are allowed only when the event or command result
contains the complete versioned read model required by every affected query and preserves tenant,
filter, ordering, authorization, and optimistic-concurrency semantics.

### Frontend Boundary Tests

Focused frontend tests must verify that:

1. a command hook invalidates its declared semantic tags only after success;
2. a failed command leaves dependent cached data intact and exposes its typed failure;
3. each domain-event consumer accepts its declared version and maps it to the correct tags;
4. duplicate local and remote invalidations are harmless and request work is deduplicated;
5. independently mounted slot contributions observe the same cache without importing each other;
6. actor or tenant changes clear cached data and terminate the previous event subscription;
7. reconnects reuse the last opaque event cursor and event reads remain tenant scoped.

## Dependency Boundaries

```txt
core ────────────────────────────► core only
context domain ──────────────────► core + its own domain
feature ─────────────────────────► core shared/frontend APIs + itself + own domain + versioned context contracts
adapter (HTTP/MCP/UI) ───────────► core + its registered feature contract
cross-context work ──────────────► versioned contracts or domain events only
```

Forbidden dependencies:

- core → context or feature;
- feature → another feature;
- versioned frontend contract → React, hooks, transport, cache runtime, or feature behavior;
- a context → another context’s domain or feature;
- direct MongoDB/HTTP/MCP/provider SDK access from a feature;
- circular imports.

`npm run check:imports` runs dependency-cruiser in CI to enforce import boundaries and circular-import rules. `validate-feature-definitions.ts` validates feature JSON, enum references, contract files, routes, MCP tools, security invariants, and the declared dependency graph.

Feature and domain code are explicitly denied imports from `core/backend`, Node runtime modules,
MongoDB, MCP, identity, environment, and provider packages. `npm run check:import-fixtures` executes
deliberately invalid source fixtures so a weakened dependency rule makes the architecture gate fail.

## AIFA Runtime Rules

Every feature receives only:

- validated input;
- actor and metadata;
- explicitly declared capabilities;
- `ok` and `fail` result helpers.

The runtime denies undeclared capabilities. MongoDB access, authorization, audit events, idempotency, and transaction/outbox behavior belong to capabilities and adapters, not features.

## AI, Ollama, and MCP

The Generate Task Plan feature calls `AssistantGenerateTaskPlan`, a provider-neutral runtime capability. The first adapter targets a locally configured Ollama instance. Future cloud providers implement the same adapter contract.

MCP-compatible clients can create, list, and delete tasks; generate plans; and move task statuses. AI mutations use the same feature contracts as browser actions. Suggestions remain reviewable before task creation, while status changes are explicit and audited.

Provider output must satisfy a versioned JSON Schema before it reaches feature logic. The Ollama adapter applies timeouts, bounded retries, rate limits, health checks, and response-size limits. Prompt text and provider responses are treated as untrusted data: they never select capabilities, bypass authorization, or directly mutate tasks.

## Quality Gates

Before merge, CI must run:

1. TypeScript type checking.
2. JSON Schema validation for every feature definition.
3. Declared dependency DAG validation.
4. dependency-cruiser boundary and circular-import checks.
5. Feature behavioral tests through the AIFA runtime.
6. MongoDB integration tests using a disposable test database.
7. HTTP and MCP contract tests confirming they invoke the same feature behavior.
8. Authorization, tenant-isolation, idempotency, optimistic-concurrency, and outbox integration tests.

These gates keep a growing enterprise product modular, independently testable, and safe for concurrent AI and human development.
