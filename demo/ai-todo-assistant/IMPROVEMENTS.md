# Improvement Backlog

This backlog captures intentional clean-code and maintainability refinements. It complements [TODO.md](TODO.md): items here are not required for the current local demonstration, but should be completed before using this project as a long-lived reference implementation.

## Type Safety

- [x] Type dynamic feature discovery as `Promise<FeatureManifest[]>` rather than `Promise<any[]>`.
  - **Why:** Preserve compile-time guarantees from discovered manifests through routing, MCP registration, and authorization.
  - **Boundary:** `core/backend/discovery` owns the typed loading and validation adapter.

- [x] Replace remaining string-based error codes and capability declarations with enums.
  - **Why:** Avoid spelling drift between features, adapters, tests, and API clients.
  - **Boundary:** Add values to core shared enums; features consume them through typed contracts only.

## HTTP Composition

- [x] Extract route matching and JSON request parsing from `core/backend/server.ts` into typed HTTP middleware.
  - **Why:** Keep the server as composition root and make route behavior independently testable.
  - **Boundary:** The middleware may adapt HTTP only; it must not contain business rules or access feature infrastructure.

- [x] Consolidate the production server and test request handler behind one HTTP composition path.
  - **Why:** Prevent authorization, CORS, idempotency, and error-mapping behavior from drifting between execution paths.
  - **Boundary:** `core/backend/http` owns reusable middleware; `server.ts` only wires dependencies.

## Command Integrity

- [x] Use a canonical request fingerprint instead of raw `JSON.stringify` for idempotency comparison.
  - **Why:** Semantically identical JSON objects with a different property order must not be treated as different commands.
  - **Boundary:** `core/backend/idempotency` owns canonicalization and hashing; features never calculate fingerprints.

- [x] Introduce a transaction-runner interface and inject it into the HTTP command boundary.
  - **Why:** Make transaction behavior unit-testable without MongoDB and keep the Mongo implementation replaceable.
  - **Boundary:** The interface belongs in core; MongoDB supplies the infrastructure adapter.

## Verification

- [x] Add focused unit tests for typed discovery failures, canonical idempotency fingerprints, and transaction rollback behavior.
  - **Why:** Lock in the architecture guarantees as the application gains more bounded contexts.
  - **Boundary:** Tests verify core behavior through public interfaces, not database internals.
