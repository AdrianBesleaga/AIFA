# AI Todo Assistant Progress

> Architecture-review remediation is tracked separately in
> [ARCHITECTURE-REMEDIATION-TODO.md](ARCHITECTURE-REMEDIATION-TODO.md). That tracker is the
> authoritative status for findings from the 2026-08-15 architecture review.

Update this checklist as work is completed. Read [ARCHITECTURE.md](ARCHITECTURE.md) before changing the order or scope of a task.

## Completed

- [x] Define the AIFA working agreement, business goal, and enterprise architecture.
- [x] Define bounded contexts for Task Management and AI Planning.
- [x] Create machine-readable feature definitions and implementation plans.
- [x] Define JSON Schema contracts, published context contracts, and event envelopes.
- [x] Define actor/tenant, MCP/OAuth, idempotency, concurrency, audit, and outbox rules.
- [x] Add architecture validation, contract type generation, dependency checks, and TypeScript checks.

## Foundation

- [x] Create the production project workspace structure for backend and frontend code.
- [x] Add environment configuration and `.env.example` for MongoDB, OIDC, MCP, and Ollama.
- [x] Add local development infrastructure: MongoDB replica set and Ollama service.
- [x] Add application startup, graceful shutdown, health checks, and configuration validation.
- [x] Add CI workflow for `npm run check`, tests, and build artifacts.

## Core Platform

- [x] Implement shared enums, result types, actor identity, correlation metadata, and generated contract exports.
- [x] Implement the AIFA runtime with declared-capability enforcement.
- [x] Implement dynamic feature-definition and manifest discovery for the backend.
- [x] Implement MongoDB connection, tenant-scoped indexed task collections, optimistic writes, and audit records.
- [x] Implement audit-backed outbox persistence and indexes; delivery adapter remains deployment-specific.
- [x] Implement an actor-resolution boundary with local development headers and production identity-adapter seam.
- [x] Implement local stdio MCP tool discovery and invocation from feature manifests.
- [x] Implement dynamic HTTP route and MCP tool registration from feature manifests.

## Task Management Context

- [x] Implement Task domain invariants, including optimistic versioning and valid status transitions.
- [x] Implement the Create Task feature: backend, MUI slot contribution, manifest, and tests.
- [x] Implement the List Tasks feature: backend, MUI list slot, manifest, and tests.
- [x] Implement the Change Task Status feature: backend, MUI controls, MCP tool, manifest, and tests.
- [x] Implement the Delete Task feature: backend, confirmation dialog, MCP tool, manifest, and tests.

## AI Planning Context

- [x] Implement persisted generated TaskPlan records and initial review state.
- [x] Implement the Ollama provider adapter with structured-output validation, timeouts, and safe local fallback.
- [x] Implement the Generate Task Plan feature: backend, MUI assistant panel, MCP tool, manifest, and tests.
- [x] Implement suggestion acceptance through the Create Task API boundary.

## React Application

- [x] Introduce the generic frontend query/event runtime, versioned context cache tags, and feature-local query/command hooks; replace workspace-wide command orchestration with semantic cache invalidation.
- [x] Create the MUI theme, React shell, API client, typed slot registry, and dynamic frontend discovery.
- [x] Build the category-based task board.
- [x] Build task-category and task-status filtering.
- [x] Build AI-plan review, acceptance, failure, and loading states.
- [x] Add responsive layout and empty/error states using MUI components.
- [x] Redesign the app shell with responsive header, navigation, footer, and a Kanban task board with a horizontal category rail.
- [x] Add slot-based AI connection settings for Ollama and MCP preferences.
- [x] Extract AI connection preferences into the independent Workspace Settings feature boundary.
- [x] Add a branded landing page and a modern, responsive dashboard while preserving typed slot composition.

## Quality and Release Readiness

- [x] Add feature-level runtime behavioral tests.
- [x] Add disposable-database MongoDB integration coverage (CI service and local opt-in script).
- [x] Add HTTP authentication/idempotency boundary and task tenant/concurrency integration coverage; MCP parity remains covered through manifest-driven adapter composition.
- [~] Browser end-to-end tests for the critical user and AI-assisted flows are intentionally deferred.
- [x] Add operational documentation for deployment, backup, monitoring, incident response, and model-provider privacy.
- [x] Review and address security, authorization, idempotency, performance, event compatibility, and data-retention requirements before release.
