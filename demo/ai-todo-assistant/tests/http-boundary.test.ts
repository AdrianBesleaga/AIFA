import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createRequestHandler } from "../core/backend/http/request-handler.js";
import {
  HttpMethod,
  PermissionScope,
  SlotName,
} from "../core/shared/architecture-enums.js";
import { FeatureName } from "../core/shared/generated/feature-names.js";
test("HTTP boundary enforces actor and idempotency before invoking features", async () => {
  let calls = 0;
  const handler = createRequestHandler({
    manifests: [
      {
        name: FeatureName.CreateTask,
        backend: {
          method: HttpMethod.Post,
          route: "/api/tasks",
          requiredScopes: [PermissionScope.TaskWrite],
          contract: {
            inputSchema: { type: "object" },
            outputSchema: { type: "object" },
            validateInput: (value) =>
              (value as Record<string, unknown>).title
                ? []
                : [{ path: "/title", message: "is required" }],
            validateOutput: () => [],
            validateEvent: () => [],
          },
          feature: {
            name: FeatureName.CreateTask,
            capabilities: [],
            execute: async () => ({ ok: true, value: {} }),
          },
        },
        frontend: { contributions: [{ slot: SlotName.TaskComposer, name: "test" }] },
      },
    ],
    resolveActor: (headers) =>
      headers["x-aifa-user-id"]
        ? {
            tenantId: "t",
            userId: "u",
            scopes: headers["x-aifa-scopes"]?.toString().split(",") ?? [],
          }
        : null,
    run: async () => {
      calls++;
      return { ok: true, value: { accepted: true } };
    },
  });
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No port");
  try {
    const unauthenticated = await fetch(`http://127.0.0.1:${address.port}/api/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(unauthenticated.status, 401);
    const forbidden = await fetch(`http://127.0.0.1:${address.port}/api/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-aifa-user-id": "u", "idempotency-key": "1234567890123456" },
      body: "{}",
    });
    assert.equal(forbidden.status, 403);
    const invalid = await fetch(`http://127.0.0.1:${address.port}/api/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-aifa-user-id": "u", "x-aifa-scopes": "TaskWrite" },
      body: "{}",
    });
    assert.equal(invalid.status, 400);
    const accepted = await fetch(`http://127.0.0.1:${address.port}/api/tasks`, {
      method: "POST",
      headers: {
        "x-aifa-user-id": "u",
        "x-aifa-scopes": "TaskWrite",
        "idempotency-key": "1234567890123456",
        "content-type": "application/json",
      },
      body: JSON.stringify({ title: "Valid task" }),
    });
    assert.equal(accepted.status, 200);
    assert.equal(calls, 1);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
