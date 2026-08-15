# Architecture Remediation Progress

Updated: 2026-08-15

Source review: [Architecture-Improvements.md](Architecture-Improvements.md)

Status legend:

- `[x]` implemented and covered by the current quality gates
- `[~]` materially improved, with listed follow-up work remaining
- `[ ]` not completed yet

## P0 correctness and security boundaries

- [x] **P0-01 — Enforce feature contracts at runtime.**
  - Feature discovery compiles input, output, and event validators with Ajv.
  - HTTP rejects invalid input with field details.
  - Successful outputs are validated before serialization.
  - Task features return tenant-free `TaskView` DTOs rather than domain records.
  - Tests prove invalid enums are rejected and `tenantId` fails the output contract.

- [x] **P0-02 — Make capability enforcement type-safe.**
  - Runtime preflights every declared capability.
  - Missing capabilities fail the invocation before feature execution.
  - Undeclared access throws a private runtime error that is mapped to a typed failure.
  - Features use exact `Pick<...>` capability types.
  - Negative tests cover missing and undeclared capability access.

- [x] **P0-03 — Bind tenancy and actor identity in infrastructure.**
  - Task and plan persistence adapters are created for an authenticated actor.
  - Feature-supplied persistence commands no longer accept tenant or actor IDs.
  - Neutral create/update commands are enriched inside MongoDB adapters.
  - Integration tests prove a malicious tenant override is ignored.

- [x] **P0-04 — Make idempotency atomic with mutations.**
  - Idempotency completion now commits in the same MongoDB transaction as business data and events.
  - Execution fencing prevents an expired worker from completing a recovered command.
  - External AI calls are prepared before opening the MongoDB transaction.
  - The durable command stores its canonical input before the provider call and persists prepared external-capability results for crash recovery.
  - Lease heartbeats and execution fences protect external work; integration tests cover recovery before preparation, after preparation, and before completion.

- [x] **P0-05 — Persist contract-conforming events.**
  - Features emit typed event intent through `DomainEventEmit`.
  - Runtime-owned infrastructure adds the full actor/request/event envelope.
  - Events are validated against the feature's declared schema before persistence.
  - Outbox delivery metadata is stored separately from the event payload.
  - Integration tests validate actual stored audit and outbox event payloads.

- [x] **P0-06 — Make outbox claiming concurrency-safe.**
  - Claims use atomic `findOneAndUpdate` operations.
  - Claims carry worker IDs, claim tokens, and expiring leases.
  - Only the winning worker receives an event.
  - Expired processing leases are recoverable.
  - Failures use bounded exponential backoff and a dead-letter state.
  - The worker runs as a supervised loop and handles SIGINT/SIGTERM.
  - Integration tests cover concurrent claims and expired-lease recovery.

- [x] **P0-07 — Remove hidden product coupling from core.**
  - Context infrastructure is dynamically discovered through infrastructure manifests.
  - The server no longer imports Task Management or AI Planning adapters directly.
  - Generic clock, ID, event, outbox, and transaction behavior is core-owned.
  - Task taxonomy moved to Task Management's versioned contract.
  - Task state and commands live in a Task Management controller; the core shell now owns navigation and authentication only.

## P1 architectural integrity

- [x] **P1-01 — Prevent definition/manifest/schema/contribution drift.**
  - Discovery checks name, route, method, capabilities, scopes, MCP exposure, tool name, and slots.
  - The architecture validator compares declared frontend slots with executable contribution source.
  - Manifests use `satisfies FeatureManifest`.

- [x] **P1-02 — Make dependency enforcement scalable.**
  - Dependency rules are generated from discovered contexts and features.
  - Rules cover cross-context implementation imports, feature-to-feature imports, infrastructure direction, and domain direction.

- [x] **P1-03 — Type slots by slot name.**
  - `SlotModelMap` binds every slot name to its model at compile time.
  - `SlotContribution<S>` and `Slot<S>` preserve that relationship.
  - Registry instances reject duplicate contribution names and support test reset.
  - Slot models are small, purpose-specific shell, composer, row-action, assistant, and task-list interfaces.

- [x] **P1-04 — Remove the central feature-name edit bottleneck.**
  - `FeatureName` is generated from discovered feature definitions.

- [x] **P1-05 — Make MCP tools safe contract projections.**
  - MCP input is projected from each feature's JSON Schema.
  - Mutations require a stable caller-supplied `commandId` and forward it as idempotency metadata.
  - Generic route-template expansion replaces the task-specific path replacement.
  - Tool descriptions and safety annotations include read-only, destructive, confirmation, and idempotency intent.
  - `zod` is now a direct dependency.
  - Remote stateless Streamable HTTP MCP exposes OAuth protected-resource metadata and scope-filtered tools.
  - An in-memory MCP client test proves route expansion, actor forwarding, body projection, and idempotency parity with HTTP.

- [x] **P1-06 — Report AI behavior honestly.**
  - Provider failures and invalid output are typed failures; there is no silent fabricated fallback.
  - Ollama uses structured output, schema validation, timeouts, bounded retry, and response-size limits.
  - Successful plans contain provider, model, prompt-version, and latency provenance.
  - The adapter enforces concurrent and per-minute limits, opens a bounded circuit, and reports readiness health metrics.
  - Dedicated tests cover retry, invalid output, circuit opening, concurrency limiting, and rate limiting.

- [x] **P1-07 — Remove disconnected AI settings behavior.**
  - The browser no longer stores pretend provider settings in local storage.
  - The UI accurately states that provider configuration is server-managed.

- [x] **P1-08 — Align domain behavior with acceptance criteria.**
  - Status transitions use an explicit transition table and typed invalid-transition failure.
  - Delete distinguishes not-found from version conflict.
  - Optimistic save conflicts reload and return a sanitized current representation.
  - Event types use an enum.

- [x] **P1-09 — Harden HTTP behavior.**
  - JSON requests enforce content type and a one-megabyte size limit.
  - A top-level error boundary returns sanitized typed errors.
  - Correlation and causation headers are preserved or derived.
  - CORS and API base URL are configurable.
  - Development identity headers are excluded from production browser builds.
  - The browser implements OIDC authorization-code/PKCE with state validation and session-scoped access tokens.
  - Request deadlines, structured completion/error telemetry, readiness detail, and production status mapping are implemented.

- [x] **P1-10 — Define a deployable backend path.**
  - Zero-config development uses `MongoMemoryReplSet`.
  - The build emits server and web artifacts separately.
  - Production `start`, `start:mcp`, and `start:outbox` scripts exist.
  - Discovery works with both TypeScript source and compiled JavaScript manifests.
  - CI starts the compiled server artifact, waits for Mongo-backed readiness, and shuts it down cleanly.

## P2 quality and scale

- [x] Frontend commands reject on failure; create and planning UI advance only after success.
- [x] Busy state is keyed by operation/entity instead of one application-wide flag.
- [x] Filter refreshes ignore stale responses.
- [x] Frontend server state uses semantic cache tags; feature-owned hooks and declared domain-event consumers invalidate independent list, summary, and count subscribers without feature imports.
- [x] Slot registry lifecycle is explicit and duplicate registration fails.
- [x] List Tasks has bounded cursor pagination with deterministic `(createdAt, id)` ordering.
- [x] Configuration validates ports and URLs; liveness and MongoDB readiness are separate endpoints.
- [x] Tests now cover contract boundaries, capability failures, tenant overrides, event schemas, fencing, and concurrent outbox claims.
- [x] Production contributions are code-split and MUI icons use direct imports.
  - The build now transforms about 957 modules; the largest chunk is about 358 kB.
  - CI enforces a 400 kB largest-chunk and 600 kB total-JavaScript budget.
- [x] Generated contracts are used by frontend DTOs and selected feature inputs/outputs; runtime schemas remain authoritative.
  - Schema titles produce stable names, and generation deduplicates identical declarations while rejecting conflicts.

## P3 interface polish

- [x] Delete confirmation uses an accessible MUI dialog instead of `window.confirm`.
- [x] Create and planning selects have accessible labels.
- [x] Priority comparisons use the enum rather than a raw string.
- [x] Repeated brand, navigation, status, and category visual constants are centralized with the MUI theme.
- [x] Focused server-rendered accessibility tests cover task inputs and destructive-action naming.
- [x] Browser verification covers landing-to-workspace composition, task creation, refresh, and the accessible delete confirmation.

## Verification status

- [x] `npm run check`
- [x] `npm test` — 18 tests passing
- [x] `npm run build` — server and web artifacts produced
- [x] Built-server smoke test
- [x] Browser end-to-end verification
