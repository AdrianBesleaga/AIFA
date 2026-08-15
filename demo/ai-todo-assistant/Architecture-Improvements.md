# Architecture and Technical Review

Reviewed: 2026-08-15

Scope: `demo/ai-todo-assistant`, including the AIFA runtime, feature discovery, HTTP and MCP adapters, bounded-context boundaries, MongoDB persistence, outbox/idempotency behavior, React composition, typed slots, AI-provider integration, contracts, tests, and build/deployment setup.

## Executive summary

The repository has a good architectural vocabulary: bounded contexts, feature-local definitions, capability injection, JSON Schema contracts, optimistic concurrency, an outbox, and frontend slots are all appropriate choices. The documentation is also clearer than the implementation of most demo applications.

It is not yet a best-practice reference implementation, however. Several of its strongest guarantees exist only in documentation or JSON files and are not enforced by the executable path. The largest risks are:

1. HTTP and MCP input/output schemas are not used at runtime.
2. Features choose tenant IDs instead of receiving tenant-bound capabilities.
3. Idempotency is not atomic with the business transaction and has a duplicate-execution crash window.
4. Written audit/outbox records do not conform to the declared event contracts.
5. The outbox claim operation is unsafe with concurrent workers.
6. `core` is coupled to product contexts on both the backend and frontend despite the stated dependency rule.
7. Capability enforcement can return a `FeatureFailure` where a feature expects a domain value, causing silent data corruption rather than a safe failure.
8. The frontend slots are dynamically discovered but are not actually typed per slot, and every contribution depends on one product-wide `AppModel`.
9. MCP exposes an unstructured catch-all schema and creates a new idempotency key on every call, which is poor for AI tool safety and retry behavior.
10. The Ollama path silently replaces provider failures or invalid output with fabricated suggestions while recording the operation as a successful AI plan.

The current checks and tests pass, and the frontend production bundle builds. That proves the current implementation is internally consistent at the TypeScript/import-test level; it does not prove the architectural claims above.

## Severity guide

- **P0 — correctness or security boundary:** fix before presenting this as a best-practice architecture.
- **P1 — architectural integrity:** fix before using the repository as the basis for extension.
- **P2 — maintainability and operational quality:** address as the reference implementation matures.
- **P3 — polish:** valuable, but not a structural blocker.

## Findings

### P0-01 — Declared JSON Schemas are not enforced at runtime

**Evidence**

- `core/backend/http/request-handler.ts:49-85` parses an arbitrary JSON object and passes it directly to a feature.
- `core/backend/mcp.ts:13` uses `z.object({}).catchall(z.unknown())` for every tool.
- `core/architecture/validate-feature-definitions.ts:92-166` validates that schemas compile and exist, but does not build runtime validators.
- `core/shared/generated/contracts.ts` is generated, but no application code imports it.

**What is wrong and why**

The feature definitions claim that the same schema governs HTTP, MCP, TypeScript, and provider boundaries. In practice, TypeScript interfaces are handwritten and untrusted runtime values are cast into them. Invalid enums, overlong strings, missing fields, and additional properties can reach feature logic. This also makes the API behavior differ from the published contract.

The mismatch is already observable: task features return the domain `Task`, including `tenantId`, while the output schema references `TaskView`, which explicitly excludes `tenantId` (`contexts/task-management/contracts/v1/task-view.schema.json:7-28`). The server serializes the actual domain object, so internal tenancy data is exposed and the response violates its schema.

**Improve**

- Compile feature-local input and output validators during discovery.
- Store the validators in the executable manifest and validate before and after `runtime.run`.
- Map domain entities to explicit API DTOs; never serialize persistence/domain records directly.
- Generate and import TypeScript types from the same schemas instead of maintaining parallel interfaces.
- Return a typed `InvalidInput` with field-level validation details and treat invalid feature output as an internal contract violation.

### P0-02 — Capability enforcement fails with the wrong value type

**Evidence**

- `core/backend/runtime/aifa-runtime.ts:14-35` returns an async function containing `fail(...)` for undeclared or missing capabilities.
- Feature capability interfaces expect values such as `string`, `Task`, `Task[]`, or `void`, not `FeatureFailure`.
- Each feature is typed against the entire context capability interface, even though it declares only a subset; for example `create-task/backend/feature.ts:15-22` receives `TaskCapabilities`.

**What is wrong and why**

If a required capability is missing, `ClockNow()` can return a `FeatureFailure` object where code expects an ISO string, or `TaskLoad()` can return a failure object where code expects a task. The feature can then persist corrupted data or crash later. Likewise, TypeScript does not prevent a feature from calling an undeclared method because it receives the full capability interface.

This is more dangerous than having no enforcement because it appears to fail safely while preserving an incompatible compile-time type.

**Improve**

- Preflight every declared capability before invoking a feature and return one invocation-level typed failure if any are missing.
- Make undeclared access throw a private runtime exception that `run` catches and maps; never masquerade as a capability's return value.
- Type each feature with `Pick<CapabilityMap, ...>` or generate its exact capability shape from the definition.
- Add negative tests for missing and undeclared capability access.

### P0-03 — Tenant isolation is delegated to feature code

**Evidence**

- `contexts/task-management/domain/task-capabilities.ts:5-25` accepts `tenantId` in capability inputs and accepts a complete tenant-owned `Task` for writes.
- `create-task/backend/feature.ts:27-41`, `list-tasks/backend/feature.ts:14-17`, and `delete-task/backend/feature.ts:19-30` copy or pass `context.actor.tenantId` themselves.
- `generate-task-plan/backend/feature.ts:36-48` constructs a tenant-owned plan and audit record.

**What is wrong and why**

The documented rule says runtime infrastructure derives tenancy and a feature cannot set or infer it. The implementation does the opposite. A future feature can accidentally or deliberately pass a different tenant ID or reuse a tenant-owned object. Review discipline is the only guard.

**Improve**

- Bind persistence, audit, and outbox capabilities to the authenticated actor in the composition/runtime layer.
- Remove `tenantId` and `actorId` from all feature-supplied capability inputs.
- Accept tenant-neutral commands/entities at the feature boundary and add tenancy only in infrastructure adapters.
- Add a test with a deliberately malicious feature that attempts cross-tenant access and prove that the capability API makes it impossible.

### P0-04 — Idempotency is not atomic with business mutations

**Evidence**

- `core/backend/server.ts:65-68` claims an idempotency record before the transaction.
- `core/backend/server.ts:88-91` commits the feature transaction, then completes the idempotency record afterward.
- `core/backend/idempotency/mongo-idempotency.ts:83-91` completes without the business transaction's session.

**What is wrong and why**

If the process crashes after the task/audit/outbox transaction commits but before `complete`, the record remains pending. After its lease expires, a retry executes the mutation again. Create and plan operations can produce duplicates because they generate fresh IDs. This directly contradicts the claim that the command result and mutation commit atomically.

There is a second design issue: every mutation is wrapped in a MongoDB transaction, so `generate-task-plan` performs a potentially 15-second external Ollama call inside a database transaction (`server.ts:88-90`, `ollama-task-planner.ts:33-38`). Transaction retries can call the provider more than once, and long network waits hold database transaction resources.

**Improve**

- Model command execution as a durable state machine with the final result committed in the same transaction as business data, audit, and outbox.
- Keep external AI calls outside MongoDB transactions. Persist a request/work item first, call the provider, then transactionally persist the validated result and command completion.
- Add lease heartbeats/fencing where work can exceed the lease.
- Treat the idempotency key as request metadata, not a feature-domain input. Normalize header/body transport before fingerprinting.
- Test crashes at every boundary: after claim, after provider response, after business commit, and before result completion.

### P0-05 — Persisted events do not match their declared contracts

**Evidence**

- `contexts/task-management/infrastructure/mongo-task-capabilities.ts:51-55` writes `{ type, tenantId, actorId, taskId, occurredAt, status }`.
- Declared event schemas require `eventId`, `eventType`, `schemaVersion`, `correlationId`, `causationId`, `idempotencyKey`, and event-specific data. For example, `task-status-changed.schema.json:6-34` also requires previous/current status and version.
- `AuditRecord` accepts an untyped `type: string` (`task-capabilities.ts:20-25`), contrary to the enum rule.

**What is wrong and why**

The outbox does not contain the published event shapes, so consumers cannot use the declared schemas. Correlation and causation are lost, schema versioning is nominal, and the status-change event lacks the information its contract promises. Static validation only checks that event schema files exist.

**Improve**

- Replace `AuditRecord` with separate typed `AuditRecord` and `DomainEventEmit` capabilities, or a typed unit-of-work result interpreted by the runtime.
- Have the runtime add the standard event envelope from actor and request metadata.
- Make event payloads discriminated unions keyed by an `AuditEventType`/`DomainEventType` enum.
- Validate emitted events against the referenced schema before persistence.
- Add contract tests that read actual MongoDB outbox documents and validate them with Ajv.

### P0-06 — Outbox claiming can double-deliver and can strand work forever

**Evidence**

- `core/backend/outbox/mongo-outbox.ts:10-27` first reads a batch, then independently updates each record, but returns every originally read event even when another worker won the update.
- Only `Pending` and `Failed` are claimable (`:12`); a worker crash leaves `Processing` records permanently stuck.
- `core/backend/outbox/worker.ts:8-12` processes one batch and exits.

**What is wrong and why**

Two workers can read the same events and both deliver them. A worker that loses the status update still receives the event from `claim`. Conversely, a crash after setting `Processing` makes the event unrecoverable. This is not a reliable outbox.

**Improve**

- Claim one event at a time with atomic `findOneAndUpdate`, a worker ID, fencing token, and lease expiry.
- Return only records actually claimed by that worker.
- Recover expired `Processing` leases and apply bounded exponential backoff plus a dead-letter state.
- Make the worker a supervised loop or explicitly document and schedule the one-shot behavior.
- Test two concurrent workers and crash recovery.

### P0-07 — `core` has hidden product and cross-context dependencies

**Evidence**

- `core/backend/server.ts:24-46` hard-codes imports for Task Management and AI Planning infrastructure.
- `core/frontend/app-model.ts:1-43` imports Task Management domain types and defines task- and AI-specific operations in core.
- `core/shared/task-taxonomy.ts` contains Task Management business vocabulary.
- `contexts/ai-planning/domain/task-planning.ts:1` imports the core task taxonomy rather than the published Task Management contract.
- The Task Management Mongo adapter supplies `IdCreate`, `ClockNow`, and `AuditRecord`; AI Planning relies on those capabilities through object spreading in `server.ts:43-47`.

**What is wrong and why**

Adding or removing a context requires editing core, and AI Planning silently depends on Task Management infrastructure. This is the opposite of independently composable feature modules. The current dependency check misses dynamic imports and type-only/context-via-core coupling, so its passing result is misleading.

**Improve**

- Move generic clock, ID, audit, outbox, and transaction capabilities into core-owned adapters.
- Discover context infrastructure/provider modules through explicit adapter manifests at the composition root.
- Move task taxonomy to Task Management and generate a versioned consumer type for AI Planning.
- Replace the product-specific core `AppModel` with shell-only contracts plus feature-owned stores/controllers.
- Strengthen dependency-cruiser rules to cover every context pair, infrastructure folders, type-only imports, and dynamic-import literals. Add a direct source scan/test if the tool cannot see dynamic imports.

### P1-01 — Feature definitions, executable manifests, schemas, and UI exports can drift

**Evidence**

- Delete Task declares `TaskLoad` in `feature.definition.json:11`, but its executable feature declares only `TaskDelete` and `AuditRecord` (`backend/feature.ts:13-16`).
- List Tasks declares a `TaskSummary` contribution in its definition and manifest, but exports no `TaskSummary` contribution (`frontend/contribution.tsx:261-293`).
- `validate-feature-definitions.ts` never imports manifests or frontend contributions to compare them with the definition.

**What is wrong and why**

There are multiple sources of truth. A green architecture check does not mean the executable application matches the definition. This is especially unfriendly to AI-assisted changes because agents can update one representation and reasonably assume it is authoritative.

**Improve**

- Generate the executable manifest's static metadata from `feature.definition.json`, or make a typed TypeScript definition the source and emit JSON.
- At minimum, validate name, route, method, capabilities, scopes, MCP exposure/tool name, and frontend slot/name parity against loaded executable modules.
- Fail on declared-but-missing and implemented-but-undeclared contributions.
- Use `satisfies FeatureManifest` on every manifest to retain literal checking.

### P1-02 — The dependency policy is incomplete and not scalable

**Evidence**

- `core/architecture/.dependency-cruiser.cjs:10-21` names only Task Management and AI Planning cross-context rules; Workspace Settings is absent.
- It does not enforce feature-to-feature isolation within the same context, feature-to-infrastructure imports, or infrastructure-to-feature direction.
- `dependency-policy.json` is descriptive and is not consumed by the checker.

**What is wrong and why**

Every new context requires hand-editing pairwise rules, creating an O(n²) policy and a central merge hotspot. Several forbidden dependency classes described in `ARCHITECTURE.md` are not executable rules.

**Improve**

- Express generic path-capture rules for context identity and feature identity.
- Enforce allowed dependency directions rather than enumerating a few forbidden pairs.
- Either generate dependency-cruiser configuration from `dependency-policy.json` or remove the unused policy file.
- Add architecture fixture tests containing intentional violations so rule regressions are visible.

### P1-03 — The slot system is dynamic, but not typed by slot

**Evidence**

- `SlotContribution<Model = unknown>` has no relationship between `slot` and `Model` (`slot-registry.ts:5-10`).
- `Slot` accepts `model: unknown` (`Slot.tsx:5`).
- All feature UIs import the same product-wide `AppModel`, including methods owned by unrelated features.
- Row action contributors locally redeclare an identical `RowModel` instead of consuming a slot contract.

**What is wrong and why**

A contribution can register for the wrong slot with the wrong model and still compile. The central `AppModel` couples Create Task, List Tasks, Delete Task, Change Status, AI Planning, navigation, and settings. Removing one feature still leaves its API in core. This is service-locator-style coupling disguised as slots.

**Improve**

- Define a `SlotModelMap` and type `SlotContribution<S extends SlotName>` as `render(model: SlotModelMap[S])`.
- Give each slot the smallest capability/view model it needs.
- Put feature state and commands behind feature-owned controllers/hooks; shell slots should receive composition concerns only.
- Define reusable row-action and navigation slot contracts centrally without importing product domain implementations.
- Avoid wrapping every contribution in a `<span>` (`Slot.tsx:8-10`); use keyed fragments or a slot-specific layout component because block MUI components inside spans produce invalid semantics/layout.

### P1-04 — Central enums create a feature-extension bottleneck

**Evidence**

- Every feature and slot name must be added to `core/shared/architecture-enums.ts`.
- The validator then requires each feature definition name and slot to exist in those enums (`validate-feature-definitions.ts:123-129`).

**What is wrong and why**

The closed enum is useful for well-known platform concepts, but feature names are discovered extension identifiers. Requiring every new feature to edit a central file contradicts “add one feature folder” and increases merge conflicts for humans and AI agents working in parallel.

**Improve**

- Generate `FeatureName` (and, if desired, contribution identifiers) deterministically from validated definitions.
- Keep a small closed enum only for platform-owned slots/capabilities, or support bounded-context-owned slot extension namespaces.
- Add duplicate detection without requiring a hand-maintained registry.

### P1-05 — MCP tools are not safe, descriptive contract projections

**Evidence**

- Every tool receives the same catch-all schema (`core/backend/mcp.ts:13,27-31`).
- Tool descriptions contain only the feature name.
- Mutations receive a newly generated idempotency key when the caller omits one (`:37-45`), so an MCP retry is a new command.
- Route adaptation only knows the literal `:taskId` parameter (`:46-49`).
- `zod` is imported directly but is only a transitive dependency of the MCP SDK, not a declared dependency.

**What is wrong and why**

AI clients cannot see required fields, enums, confirmation constraints, or useful descriptions. Invalid tool input travels through the same unvalidated HTTP path. Automatic random keys defeat caller-visible idempotency. The path adapter is not extensible to new route parameters.

**Improve**

- Project each feature's JSON Schema into the MCP SDK input schema and include field descriptions/examples.
- Require or deterministically derive a stable command ID supplied by the calling conversation/tool execution; preserve it across retries.
- Surface confirmation requirements in schema and tool annotations, and enforce them at the governed boundary.
- Use a generic route-template expander and shared HTTP/MCP invocation adapter.
- Declare every direct import in `package.json`.
- Add remote Streamable HTTP/OAuth support if the architecture document continues to promise it; otherwise narrow the documentation to the implemented stdio bridge.

### P1-06 — AI failures are silently reported as successful plans

**Evidence**

- `contexts/ai-planning/infrastructure/ollama-task-planner.ts:39-46` returns local fallback suggestions for HTTP failure, invalid JSON, invalid structure, timeouts, and every thrown error.
- The adapter uses manual shape checks rather than the published suggestion schema (`:19-27`).
- The feature always persists and audits `TaskPlanGeneratedV1` (`generate-task-plan/backend/feature.ts:32-51`).
- The feature definition says invalid output returns `AssistantResponseInvalid`, but that error code does not exist and the behavior is not implemented.

**What is wrong and why**

Users and operators cannot tell whether AI ran. Provider outages and contract regressions look like successful AI output, corrupting observability and trust. The implementation also omits documented bounded retries, rate limits, health checks, structured-output mode, and response-size limits.

**Improve**

- Return a discriminated provider result containing provider/model, provenance, latency, and typed failure.
- Validate output with the same Ajv schema used elsewhere and request Ollama structured JSON output when supported.
- Make fallback an explicit product policy and label fallback suggestions in the result/UI; do not silently substitute it.
- Add bounded retry only for retryable failures, response byte/token limits, circuit breaking/rate limiting, and metrics.
- Store prompt/template version and model provenance with the plan without storing sensitive raw content by default.

### P1-07 — AI settings are disconnected from runtime behavior

**Evidence**

- Settings are stored only in browser local storage (`manage-ai-settings/frontend/contribution.tsx:13-28`).
- The backend feature always returns `{ configured: false }` (`backend/feature.ts:8-17`).
- The server constructs Ollama once from environment configuration (`core/backend/server.ts:38-47`).
- The planner never reads workspace settings.

**What is wrong and why**

The UI claims users can choose Ollama or MCP, but changing it has no effect. This is misleading and introduces three conflicting configuration sources: local storage, the placeholder settings endpoint, and server environment variables.

**Improve**

- Either remove/label the screen as a non-functional mock or implement a tenant-scoped settings aggregate and provider-router capability.
- Keep credentials server-side; browser settings should reference a server-managed connection ID, not arbitrary runtime endpoints.
- Add a connection test operation, authorization, audit trail, validation, and clear effective-configuration display.
- Include `SettingsRead` in the local UI's scopes if the endpoint is actually used (`core/frontend/api.ts:4-8`).

### P1-08 — Domain and feature behaviors contradict their own acceptance criteria

**Evidence**

- `transitionTaskStatus` permits every enum-to-enum transition (`contexts/task-management/domain/task.ts:21-29`), while the definition promises invalid-transition failures.
- Delete returns `NotFoundOrVersionConflict` (`delete-task/backend/feature.ts:19-25`), while the definition promises `NotFound` and the architecture promises a distinct version conflict with the current representation.
- After a save race, Change Status returns the task loaded before the race as conflict details (`change-task-status/backend/feature.ts:36-40`), not the current stored task.
- Event type literals remain free-form strings rather than enums.

**What is wrong and why**

The domain model is not the authoritative source of the rules described by the architecture. Ambiguous errors make clients guess whether to refresh, retry, or report a missing record.

**Improve**

- Define an explicit transition table and a typed domain result such as `InvalidStatusTransition`.
- For delete, load then delete with optimistic version inside the transaction, distinguishing not-found from stale-version safely.
- On optimistic conflicts, reload and return a sanitized current view.
- Generate or centralize typed error/event unions and test every transition and race path.

### P1-09 — HTTP robustness and production authentication are incomplete

**Evidence**

- Request bodies are buffered without a size limit (`request-parser.ts:7-10`).
- Exceptions from actor resolution, feature execution, MongoDB, or serialization are not caught by the request handler (`request-handler.ts:33-89`).
- The frontend hard-codes the API origin and development identity headers (`core/frontend/api.ts:1-10`).
- CORS origin is hard-coded in the backend (`server.ts:51-54`).
- `statusFor` maps most typed failures to 400 and does not map `NotFoundOrVersionConflict` meaningfully (`request-handler.ts:21-31`).

**What is wrong and why**

Large requests can exhaust memory, infrastructure errors can terminate a request without a stable JSON response, and the built frontend cannot operate against production OIDC. API location and identity cannot vary safely by deployment.

**Improve**

- Add a bounded streaming JSON parser, content-type enforcement, and request timeout.
- Add one top-level error boundary that logs correlation data and returns a sanitized typed 500 response.
- Implement an auth/session adapter in the frontend and use same-origin or environment-injected API configuration.
- Validate and configure CORS by environment; include credentials only when the chosen auth model requires them.
- Define a complete error-to-HTTP mapping and set JSON content type on every JSON response.
- Preserve or derive correlation/causation IDs from validated headers instead of always generating unrelated IDs.

### P1-10 — The default backend path is not a deployable or transaction-safe runtime

**Evidence**

- Without `MONGODB_URI`, `server.ts:15-20` starts `MongoMemoryServer`, which is a standalone server, but every mutation uses transactions.
- `npm run build` runs `tsc --noEmit` and Vite; it creates no backend artifact.
- There is no production `start` script, and backend discovery explicitly searches for `manifest.ts` (`discover-features.ts:25`).
- Server infrastructure imports are literal `.ts` filesystem paths (`server.ts:24-40`).

**What is wrong and why**

The no-config development fallback starts successfully but transaction-backed mutations require a replica set and will fail. Separately, “build succeeded” means only that the frontend was bundled and TypeScript checked; there is no defined production server artifact or startup contract.

**Improve**

- Use `MongoMemoryReplSet` for a zero-config transactional demo, or require the documented Docker replica set and fail fast.
- Define a backend build/output strategy and `start`, `start:mcp`, and worker deployment commands.
- Make discovery extension-agnostic or bundle/generate a deterministic manifest index at build time.
- Add a smoke test that starts the built artifact and completes one real mutation.

### P2-01 — Frontend command APIs hide failure from their callers

**Evidence**

- `App.run` catches errors and resolves normally (`core/frontend/App.tsx:48-62`).
- Create Task clears its input in `.then(...)` even after a failed request (`create-task/frontend/contribution.tsx:44-46`).
- `generatePlan` converts every failure to an empty list (`App.tsx:63-83`), which is indistinguishable from a valid empty plan.

**Improve**

Return a typed command result or rethrow after setting shared error state. Feature UI should clear or advance only on explicit success. Preserve provider/validation errors for the planning panel rather than collapsing them into `[]`.

### P2-02 — One global model and `busy` flag couple unrelated UI behavior

**Evidence**

- `App.tsx:24-133` owns all feature data fetching and commands.
- `AppModel.busy` disables create, delete, status, and planning controls together.
- Filters trigger asynchronous refreshes with no cancellation or stale-response guard (`App.tsx:34-47`).

**Improve**

Use feature-owned query/command state keyed by operation/entity. Add abort signals or request sequencing for filter changes. Prefer a small shared query cache/event invalidation boundary over forcing all features through one shell component.

### P2-03 — Feature discovery and registry lifecycle are fragile

**Evidence**

- Backend discovery recursively imports every file named `manifest.ts` without first tying it to a validated `feature.definition.json` (`discover-features.ts:19-34`).
- Frontend discovery relies on three magic export names (`contribution`, `settingsContribution`, and `contributions`) (`discover-contributions.ts:2-18`).
- The slot registry is global mutable module state with no reset/isolation API (`slot-registry.ts:12-28`).

**Improve**

- Discover one well-defined module per validated feature definition.
- Require one standard export, such as `frontendContributions`.
- Construct a registry instance at application bootstrap and inject it, making duplicate behavior explicit and testable.
- Decide whether duplicate names are errors; silently replacing a contribution can hide collisions.

### P2-04 — List Tasks has no pagination and weak deterministic ordering

**Evidence**

- `mongo-task-capabilities.ts:18-25` returns all matching tasks.
- Sorting uses only `createdAt`, so equal timestamps have no stable tie-breaker.

**Improve**

Add a bounded page size and cursor based on `(createdAt, id)`, include the cursor in HTTP/MCP contracts, and create matching indexes. Keep filtering in the backend; avoid redundant client filtering once the server query is authoritative.

### P2-05 — Configuration and health checks are too shallow

**Evidence**

- `config.ts` validates the idempotency lease and some production presence checks, but not `PORT`, host/origin URLs, database name, Ollama URL, or conflicting settings.
- `/health` always returns `ok` without checking readiness (`request-handler.ts:45`).
- Shutdown handles `SIGTERM` only (`server.ts:100-107`).

**Improve**

Parse configuration through a runtime schema, separate liveness from readiness, check MongoDB and required provider dependencies, and support `SIGINT` plus server-drain timeouts. Use structured logs with correlation IDs and avoid logging tenant identifiers unnecessarily.

### P2-06 — Test coverage verifies the happy architecture, not its failure boundaries

**Current strengths**

The suite covers feature behavior, basic actor/scopes, HTTP idempotency presence, tenant-filtered Mongo operations, canonical fingerprints, route matching, transaction rollback, and simple outbox success/failure.

**Missing high-value tests**

- Runtime input/output schema rejection and DTO sanitization.
- Capability missing/undeclared behavior.
- Malicious tenant override attempts.
- Idempotency crash recovery and concurrent same-key calls.
- Concurrent outbox workers and expired processing leases.
- Actual event documents validated against published schemas.
- Manifest/definition/contribution parity.
- MCP schema, confirmation, auth, and retry parity with HTTP.
- Production JWT claim edge cases and frontend OIDC behavior.
- Ollama timeout, oversized response, invalid schema, retry, provenance, and explicit fallback behavior.
- React slot contract tests, feature UI tests, accessibility checks, and critical browser flows.
- Built-backend smoke test.

### P2-07 — The frontend bundle path does excessive module work

**Evidence**

The production build succeeded but transformed approximately 11,706 modules and emitted a roughly 480 kB JavaScript chunk (about 149 kB gzip). It also produced thousands of MUI `"use client"` warnings. Eager feature discovery loads every contribution at startup (`discover-contributions.ts:8-11`).

**Improve**

- Add bundle-size budgets and bundle analysis to CI.
- Prefer lazy contribution loading by route/surface where practical.
- Verify MUI import/tree-shaking configuration and consider direct icon imports if analysis shows the barrel import is responsible.
- Configure Vite warning handling so actionable warnings are visible rather than buried.

### P2-08 — API and domain types are duplicated and inconsistently owned

**Evidence**

- `core/frontend/app-model.ts` handwrites `TaskView` and `TaskSuggestion`.
- Backend features handwrite input interfaces beside generated but unused schemas.
- Task taxonomy is duplicated conceptually between TypeScript enums and multiple JSON schemas.

**Improve**

Generate types and validators once, expose versioned public contract packages/modules per bounded context, and add explicit domain-to-contract mappers. Domain objects may remain richer than public DTOs, but that difference must be intentional and tested.

### P3-01 — UI semantics, accessibility, and maintainability need refinement

**Evidence and improvements**

- Replace `window.confirm` with the promised MUI dialog so confirmation is accessible, testable, and consistent (`delete-task/frontend/contribution.tsx:14-20`).
- Add labels/`aria-label`s to the bare `Select` controls in Create Task and AI Planning.
- Remove or wire the non-functional task-card `MoreHoriz` button (`list-tasks/frontend/contribution.tsx:62-64`).
- Replace raw priority string comparison with `TaskPriority.High` (`:71-72`).
- Break the highly compressed Settings JSX into focused components and hooks (`manage-ai-settings/frontend/contribution.tsx:20-38`).
- Move repeated visual constants into the MUI theme rather than scattering raw hex colors.
- Replace string surfaces such as `"dashboard"` and `"settings"` with a typed navigation/surface contract.

## Recommended target architecture

The following shape preserves the good parts of AIFA while closing the enforcement gaps:

```text
validated feature definition
        |
        +-- generated/compiled input + output + MCP validators
        +-- executable feature metadata checked for parity
        +-- typed frontend contribution metadata
        |
transport adapter (HTTP or MCP)
        |
        +-- authenticate -> actor
        +-- validate input -> contract DTO
        +-- normalize command metadata/idempotency
        |
invocation runtime
        |
        +-- preflight exact capabilities
        +-- bind actor/tenant to infrastructure capabilities
        +-- execute feature outside infrastructure details
        +-- validate/map output
        |
unit of work
        |
        +-- business persistence
        +-- audit envelope
        +-- domain event/outbox
        +-- idempotency result
        +-- one atomic commit
```

For AI work, use a durable two-phase workflow: transactionally create/claim a planning request, perform the provider call outside a database transaction, validate/provenance-stamp the response, then atomically persist the plan, audit/event records, and completed command result.

For the frontend, keep the shell limited to layout, navigation, authentication, error boundaries, and slot composition. Each feature should own its query/command controller. Slots should be typed through a `SlotModelMap` and receive only the contract needed for that extension point.

## Prioritized remediation plan

### Phase 1 — Make the claims true

1. Add runtime input/output validation and domain-to-DTO mapping.
2. Redesign capability failure handling and exact feature capability types.
3. Bind tenancy/actor in infrastructure capabilities.
4. Make event emission conform to declared schemas.
5. Redesign idempotency and outbox atomicity/claiming.
6. Move external AI calls outside MongoDB transactions.

### Phase 2 — Restore modularity

1. Remove context imports and product vocabulary from core.
2. Introduce discoverable infrastructure/provider manifests.
3. Generate or parity-check executable manifests from feature definitions.
4. Replace the global `AppModel` with feature-owned controllers and typed slot contracts.
5. Generate feature identifiers instead of editing a central enum for every feature.

### Phase 3 — Make AI and production adapters exemplary

1. Project real schemas and safety metadata into MCP tools.
2. Implement stable MCP command IDs, confirmation, and HTTP/MCP parity tests.
3. Make provider failure/fallback/provenance explicit and schema-validated.
4. Connect workspace settings to a server-side provider router or remove the misleading controls.
5. Define a deployable backend artifact, replica-set-safe local path, production auth flow, and built-artifact smoke tests.

### Phase 4 — Quality and scale

1. Add the negative/concurrency/contract/frontend tests listed above.
2. Add pagination, readiness, structured telemetry, and robust shutdown.
3. Add bundle budgets, lazy feature UI loading, accessibility tests, and browser E2E coverage.

## Verification performed during this review

- `npm run check` — passed: feature-definition validation, generated contracts, dependency-cruiser, and TypeScript.
- `npm test` — passed: 10 tests.
- `npm run build` — passed: Vite production bundle completed, with extensive MUI module-directive warnings and one approximately 480 kB JS chunk.
- `npm ls zod --depth=1` — confirmed `zod` is currently transitive through `@modelcontextprotocol/sdk`, not a declared direct dependency.

These green checks should be retained, but strengthened so they verify executable architecture parity and the failure boundaries identified above.
