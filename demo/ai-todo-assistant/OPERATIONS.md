# Operations Guide

## Run locally

Copy `.env.example` to `.env`, then run `docker compose up -d` and `npm run dev` from this directory. Start the local MCP server with `npm run mcp` after the API is listening.

## Data and recovery

MongoDB is the system of record. Back up the database with an encrypted, tested `mongodump` on a schedule appropriate to the tenant recovery objective. Restore into an isolated environment first, validate tenant counts and task-plan records, then promote following the incident runbook.

## Monitoring

Probe `/health` for API liveness. Alert on Mongo connection failures, outbox documents accumulating in `Pending`, repeated `VersionConflict` failures, and Ollama fallback usage. Never log task text, bearer tokens, or full model prompts in shared telemetry.

## Security and privacy

Production callers must provide a signed OIDC bearer token. The API verifies its issuer, audience, and signature using `OIDC_ISSUER_URL`, `OIDC_AUDIENCE`, and `OIDC_JWKS_URL`; it reads `sub`, `tenant_id`, and space-separated `scope` claims. The `x-aifa-*` headers are accepted only outside production. Set the short-lived `MCP_ACCESS_TOKEN` secret for the local stdio MCP bridge. Treat Ollama prompts and responses as tenant data; run local Ollama on trusted infrastructure and do not enable a remote model provider without a data-processing review.

## Incident response

1. Preserve request correlation IDs and audit events.
2. Restrict affected MCP credentials or tenant access.
3. Restore service health before replaying any outbox event.
4. Perform a tenant-scoped reconciliation from audit and task records.
