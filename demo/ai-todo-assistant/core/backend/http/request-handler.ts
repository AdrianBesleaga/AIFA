import type { IncomingMessage, ServerResponse } from "node:http";
import type { Actor, FeatureResult } from "../../shared/aifa.js";
import { ErrorCode, HttpMethod } from "../../shared/architecture-enums.js";
import type { FeatureManifest } from "../../shared/feature-manifest.js";
import { createAuthorizationMiddleware, type ActorResolver } from "./authorization-middleware.js";
import { parseRequestInput } from "./request-parser.js";
import { matchRoute } from "./route-matcher.js";
import { logger } from "../telemetry/logger.js";

export interface HttpDependencies {
  manifests: readonly FeatureManifest[];
  corsOrigin?: string;
  resolveActor: ActorResolver;
  readiness?: () => Promise<Record<string, unknown>>;
  requestTimeoutMs?: number;
  run(
    manifest: FeatureManifest,
    input: Record<string, unknown>,
    actor: Actor,
    metadata: { correlationId: string; causationId: string; idempotencyKey?: string },
  ): Promise<FeatureResult<unknown>>;
}

function statusFor(result: FeatureResult<unknown>): number {
  if (result.ok) return 200;
  if (result.error.code === ErrorCode.NotFound) return 404;
  if (result.error.code === ErrorCode.ConfirmationRequired) return 428;
  if (
    result.error.code === ErrorCode.InvalidInput ||
    result.error.code === ErrorCode.InvalidStatusTransition ||
    result.error.code === ErrorCode.AssistantResponseInvalid
  )
    return 422;
  if (
    result.error.code === ErrorCode.VersionConflict ||
    result.error.code === ErrorCode.IdempotencyKeyReused ||
    result.error.code === ErrorCode.RequestInProgress
  )
    return 409;
  if (result.error.code === ErrorCode.InternalError || result.error.code === ErrorCode.InvalidOutput)
    return 500;
  if (result.error.code === ErrorCode.ProviderUnavailable) return 503;
  return 400;
}

function writeJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(value));
}

export function createRequestHandler(dependencies: HttpDependencies) {
  const authorize = createAuthorizationMiddleware(dependencies.resolveActor);
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const correlationId = request.headers["x-correlation-id"]?.toString() ?? crypto.randomUUID();
    const startedAt = performance.now();
    response.once("finish", () =>
      logger.info("request_complete", {
        correlationId,
        method: request.method,
        path: request.url?.split("?")[0],
        status: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      }),
    );
    request.setTimeout(dependencies.requestTimeoutMs ?? 30_000, () =>
      request.destroy(new Error("Request deadline exceeded")),
    );
    response.setHeader("x-correlation-id", correlationId);
    try {
    if (dependencies.corsOrigin) {
      response.setHeader("access-control-allow-origin", dependencies.corsOrigin);
      response.setHeader(
        "access-control-allow-headers",
        "content-type, idempotency-key, x-aifa-tenant-id, x-aifa-user-id, x-aifa-scopes, authorization",
      );
      response.setHeader("access-control-allow-methods", "GET, POST, PATCH, DELETE, OPTIONS");
    }
    if (request.method === "OPTIONS") return void response.writeHead(204).end();
    if (request.url === "/health" || request.url === "/health/live")
      return writeJson(response, 200, { status: "ok" });
    if (request.url === "/health/ready") {
      try {
        const checks = await dependencies.readiness?.();
        return writeJson(response, 200, { status: "ready", checks });
      } catch {
        return writeJson(response, 503, { status: "not-ready" });
      }
    }
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    const matched = matchRoute(dependencies.manifests, request.method, url.pathname);
    if (!matched) return writeJson(response, 404, { ok: false });
    let body: Record<string, unknown>;
    try {
      body = await parseRequestInput(request, url);
    } catch {
      return writeJson(response, 400, {
        ok: false,
        error: { code: ErrorCode.InvalidJson, message: "Request must be a bounded JSON object" },
      });
    }
    const authorization = await authorize(request.headers, matched.manifest.backend.requiredScopes);
    if (!authorization.ok)
      return writeJson(response, authorization.status, {
          ok: false,
          error: { code: authorization.code, message: authorization.message },
        });
    const idempotencyKey =
      request.headers["idempotency-key"]?.toString() ?? body.idempotencyKey?.toString();
    delete body.idempotencyKey;
    if (
      matched.manifest.backend.method !== HttpMethod.Get &&
      (!idempotencyKey || idempotencyKey.length < 16)
    )
      return writeJson(response, 400, {
          ok: false,
          error: {
            code: ErrorCode.InvalidInput,
            message: "Mutations require an idempotency key",
          },
        });
    const input = { ...body, ...matched.params };
    const inputErrors = matched.manifest.backend.contract?.validateInput(input) ?? [];
    if (inputErrors.length)
      return writeJson(response, 400, {
        ok: false,
        error: {
          code: ErrorCode.InvalidInput,
          message: "Input does not satisfy the feature contract",
          details: { fields: inputErrors },
        },
      });
    const result = await dependencies.run(
      matched.manifest,
      input,
      authorization.actor,
      {
        correlationId,
        causationId: request.headers["x-causation-id"]?.toString() ?? correlationId,
        idempotencyKey,
      },
    );
    if (!result.ok) return writeJson(response, statusFor(result), result);
    const value = matched.manifest.backend.mapOutput
      ? matched.manifest.backend.mapOutput(result.value)
      : result.value;
    const outputErrors = matched.manifest.backend.contract?.validateOutput(value) ?? [];
    if (outputErrors.length)
      return writeJson(response, 500, {
        ok: false,
        error: {
          code: ErrorCode.InvalidOutput,
          message: "Feature output violated its contract",
          details: { correlationId },
        },
      });
    return writeJson(response, 200, { ok: true, value });
    } catch (cause) {
      logger.error("request_failed", {
        correlationId,
        error: cause instanceof Error ? cause.message : "Unknown error",
        durationMs: Math.round(performance.now() - startedAt),
      });
      if (!response.headersSent)
        writeJson(response, 500, {
          ok: false,
          error: { code: ErrorCode.InternalError, message: "Request failed", details: { correlationId } },
        });
      else response.end();
    }
  };
}
