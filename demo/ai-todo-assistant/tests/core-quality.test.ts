import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { discoverFeatureManifests } from "../core/backend/discovery/discover-features.js";
import { createCanonicalFingerprint } from "../core/backend/idempotency/canonical-fingerprint.js";
import { matchRoute } from "../core/backend/http/route-matcher.js";
import {
  HttpMethod,
  PermissionScope,
  SlotName,
} from "../core/shared/architecture-enums.js";
import { FeatureName } from "../core/shared/generated/feature-names.js";
import type { FeatureManifest } from "../core/shared/feature-manifest.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createFeatureMcpServer } from "../core/backend/mcp-server.js";

const manifest: FeatureManifest = {
  name: FeatureName.ChangeTaskStatus,
  backend: {
    method: HttpMethod.Patch,
    route: "/api/tasks/:taskId/status",
    requiredScopes: [PermissionScope.TaskWrite],
    feature: {
      name: FeatureName.ChangeTaskStatus,
      capabilities: [],
      execute: async () => ({ ok: true, value: {} }),
    },
  },
  frontend: { contributions: [{ slot: SlotName.TaskRowActions, name: "test" }] },
};

test("canonical idempotency fingerprints ignore JSON property order", () => {
  assert.equal(
    createCanonicalFingerprint({ input: { title: "Plan", priority: "High" }, taskId: "task-1" }),
    createCanonicalFingerprint({ taskId: "task-1", input: { priority: "High", title: "Plan" } }),
  );
  assert.notEqual(
    createCanonicalFingerprint({ values: ["first", "second"] }),
    createCanonicalFingerprint({ values: ["second", "first"] }),
  );
});

test("route matcher returns typed path parameters for a discovered manifest", () => {
  const matched = matchRoute([manifest], HttpMethod.Patch, "/api/tasks/task%201/status");
  assert.equal(matched?.manifest.name, FeatureName.ChangeTaskStatus);
  assert.deepEqual(matched?.params, { taskId: "task 1" });
  assert.equal(matchRoute([manifest], HttpMethod.Get, "/api/tasks/task-1/status"), null);
});

test("dynamic discovery rejects an invalid manifest before route registration", async () => {
  const root = await mkdtemp(join(tmpdir(), "aifa-invalid-manifest-"));
  await mkdir(join(root, "feature"));
  await mkdir(join(root, "feature", "contracts"));
  await writeFile(
    join(root, "feature", "feature.definition.json"),
    JSON.stringify({
      name: "create-task",
      businessNeed: "test",
      backend: {
        route: "/api/tasks",
        method: "POST",
        capabilities: [],
        mcp: { exposed: false },
      },
      frontend: { slots: [] },
      contracts: { input: "contracts/input.schema.json", output: "contracts/output.schema.json" },
      events: [],
      security: { mcpScopes: [], requiresConfirmation: false },
    }),
  );
  await writeFile(
    join(root, "feature", "contracts", "input.schema.json"),
    JSON.stringify({ type: "object" }),
  );
  await writeFile(
    join(root, "feature", "contracts", "output.schema.json"),
    JSON.stringify({ type: "object" }),
  );
  await writeFile(join(root, "feature", "manifest.ts"), "export const manifest = {};\n");
  await assert.rejects(discoverFeatureManifests(root), /Invalid feature manifest/);
});

test("discovery compiles executable input and output contracts", async () => {
  const manifests = await discoverFeatureManifests(join(process.cwd(), "contexts"));
  const createTask = manifests.find(({ name }) => name === FeatureName.CreateTask);
  assert.ok(createTask?.backend.contract);
  assert.equal(
    createTask.backend.contract.validateInput({
      title: "Valid",
      category: "Work",
      priority: "High",
    }).length,
    0,
  );
  assert.ok(
    createTask.backend.contract.validateInput({
      title: "Valid",
      category: "not-a-category",
      priority: "High",
    }).length > 0,
  );
  assert.ok(
    createTask.backend.contract.validateOutput({
      task: {
        id: "task",
        tenantId: "must-not-leak",
        title: "Valid",
        category: "Work",
        priority: "High",
        status: "Todo",
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        completedAt: null,
      },
    }).length > 0,
  );
});

test("MCP projects the HTTP contract, route, identity, and idempotency metadata", async () => {
  let forwarded: { url: string; init?: RequestInit } | undefined;
  const mcpManifest: FeatureManifest = {
    ...manifest,
    backend: {
      ...manifest.backend,
      contract: {
        inputSchema: {
          type: "object",
          additionalProperties: false,
          required: ["taskId", "status"],
          properties: { taskId: { type: "string" }, status: { type: "string" } },
        },
        outputSchema: { type: "object" },
        validateInput: () => [],
        validateOutput: () => [],
        validateEvent: () => [],
      },
    },
    mcp: { toolName: "change_task_status", description: "Change status" },
  };
  const server = createFeatureMcpServer(
    [mcpManifest],
    { authorization: "Bearer actor-token" },
    "http://api.test",
    async (url, init) => {
      forwarded = { url: String(url), init };
      return new Response(JSON.stringify({ ok: true, value: { changed: true } }));
    },
  );
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const result = await client.callTool({
      name: "change_task_status",
      arguments: { taskId: "task/one", status: "Completed", commandId: "command-1234567890" },
    });
    assert.equal(result.isError, false);
    assert.equal(forwarded?.url, "http://api.test/api/tasks/task%2Fone/status");
    assert.equal(new Headers(forwarded?.init?.headers).get("authorization"), "Bearer actor-token");
    assert.equal(new Headers(forwarded?.init?.headers).get("idempotency-key"), "command-1234567890");
    assert.deepEqual(JSON.parse(String(forwarded?.init?.body)), { status: "Completed" });
  } finally {
    await client.close();
    await server.close();
  }
});
