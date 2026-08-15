import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import type { ClientSession } from "mongodb";
import { config } from "./config.js";
import { createMongoDatabase } from "./database/mongo.js";
import { createAifaRuntime } from "./runtime/aifa-runtime.js";
import { createMongoPlatformCapabilities, ensurePlatformIndexes } from "./runtime/mongo-platform-capabilities.js";
import { discoverFeatureManifests } from "./discovery/discover-features.js";
import { discoverContextInfrastructure } from "./discovery/context-infrastructure.js";
import { resolveActor } from "./auth/actor-resolver.js";
import { createMongoIdempotencyStore } from "./idempotency/mongo-idempotency.js";
import { createCanonicalFingerprint } from "./idempotency/canonical-fingerprint.js";
import { createRequestHandler } from "./http/request-handler.js";
import { ErrorCode, HttpMethod } from "../shared/architecture-enums.js";
import type { Actor, RequestMetadata } from "../shared/aifa.js";
import type { FeatureManifest } from "../shared/feature-manifest.js";
import { createRemoteMcpHandler } from "./mcp-http.js";
import { createEventStreamHandler, createMongoEventStreamStore } from "./events/event-stream.js";

const memoryServer = config.mongoUri
  ? undefined
  : await (await import("mongodb-memory-server")).MongoMemoryReplSet.create({
      replSet: { count: 1 },
    });
const database = createMongoDatabase(
  config.mongoUri ?? memoryServer!.getUri(),
  config.mongoDatabase,
);
const appRoot = join(fileURLToPath(new URL("../..", import.meta.url)));
const contextsRoot = join(appRoot, "contexts");
const [manifests, infrastructure] = await Promise.all([
  discoverFeatureManifests(contextsRoot),
  discoverContextInfrastructure(contextsRoot),
]);
const mongoDatabase = await database.connect();
await Promise.all([
  ensurePlatformIndexes(mongoDatabase),
  ...infrastructure.map((adapter) => adapter.ensureIndexes(mongoDatabase)),
]);
const idempotency = createMongoIdempotencyStore(mongoDatabase, config.idempotencyLeaseMs);
await idempotency.ensureIndexes();
const infrastructureSettings = {
  ollamaBaseUrl: config.ollamaBaseUrl,
  ollamaModel: config.ollamaModel,
};

function createCapabilities(
  manifest: FeatureManifest,
  actor: Actor,
  metadata: RequestMetadata,
  session?: ClientSession,
  overrides: Record<string, unknown> = {},
) {
  return {
    ...createMongoPlatformCapabilities(
      mongoDatabase,
      actor,
      metadata,
      session,
      manifest.backend.contract?.validateEvent,
    ),
    ...Object.assign(
      {},
      ...infrastructure.map((adapter) =>
        adapter.createCapabilities({
          database: mongoDatabase,
          actor,
          metadata,
          session,
          settings: infrastructureSettings,
        }),
      ),
    ),
    ...overrides,
  };
}

async function prepareExternalCapabilities(
  manifest: FeatureManifest,
  input: Record<string, unknown>,
  actor: Actor,
  metadata: RequestMetadata,
  durableCommand: {
    record: {
      tenantId: string;
      actorId: string;
      featureName: FeatureManifest["name"];
      idempotencyKey: string;
    };
    executionId: string;
    preparedCapabilities: Record<string, unknown>;
  },
): Promise<Record<string, unknown>> {
  const external = new Set(infrastructure.flatMap(({ externalCapabilities = [] }) => externalCapabilities));
  const capabilities = createCapabilities(manifest, actor, metadata);
  const prepared: Record<string, unknown> = {};
  for (const name of manifest.backend.feature.capabilities.filter((item) => external.has(item))) {
    if (name in durableCommand.preparedCapabilities) {
      const durableValue = durableCommand.preparedCapabilities[name];
      prepared[name] = async () => durableValue;
      continue;
    }
    const capability = capabilities[name];
    if (typeof capability !== "function") continue;
    await idempotency.heartbeat(durableCommand.record, durableCommand.executionId);
    const result = await (capability as (value: unknown) => Promise<unknown>)(input);
    await idempotency.savePreparedCapability(
      durableCommand.record,
      durableCommand.executionId,
      name,
      result,
    );
    prepared[name] = async () => result;
  }
  return prepared;
}

const apiHandler = createRequestHandler({
  manifests,
  corsOrigin: config.corsOrigin,
  resolveActor,
  readiness: async () => {
    await mongoDatabase.command({ ping: 1 });
    return {
      mongo: "ok",
      ...Object.fromEntries(
        infrastructure.flatMap((adapter) =>
          adapter.health ? [[adapter.name, adapter.health()]] : [],
        ),
      ),
    };
  },
  requestTimeoutMs: config.requestTimeoutMs,
  async run(manifest, input, actor, metadata) {
    if (manifest.backend.method === HttpMethod.Get)
      return createAifaRuntime(createCapabilities(manifest, actor, metadata)).run(
        manifest.backend.feature,
        input,
        actor,
        metadata,
      );
    const idempotencyKey = metadata.idempotencyKey!;
    const record = {
      tenantId: actor.tenantId,
      actorId: actor.userId,
      featureName: manifest.name,
      idempotencyKey,
    };
    const claim = await idempotency.claim({
      ...record,
      inputFingerprint: createCanonicalFingerprint(input),
      commandInput: input,
    });
    if (claim.kind === "completed") return claim.result;
    if (claim.kind === "key-reused")
      return {
        ok: false,
        error: {
          code: ErrorCode.IdempotencyKeyReused,
          message: "The idempotency key was used with different input",
          details: {},
        },
      };
    if (claim.kind === "in-progress")
      return {
        ok: false,
        error: {
          code: ErrorCode.RequestInProgress,
          message: "A request with this idempotency key is still running",
          details: {},
        },
      };

    const prepared = await prepareExternalCapabilities(manifest, input, actor, metadata, {
      record,
      executionId: claim.executionId,
      preparedCapabilities: claim.preparedCapabilities,
    });
    return database.withTransaction(async (session) => {
      const result = await createAifaRuntime(
        createCapabilities(manifest, actor, metadata, session, prepared),
      ).run(manifest.backend.feature, input, actor, metadata);
      await idempotency.complete(record, claim.executionId, result, session);
      return result;
    });
  },
});
const remoteMcpHandler = createRemoteMcpHandler({
  manifests,
  resolveActor,
  apiBaseUrl: `http://${config.host}:${config.port}`,
  resourceUrl: new URL("/mcp", config.publicBaseUrl).href,
  authorizationServer: config.oidcIssuerUrl,
});
const eventStreamHandler = createEventStreamHandler({
  store: createMongoEventStreamStore(mongoDatabase),
  resolveActor,
  corsOrigin: config.corsOrigin,
});
const server = createServer(async (request, response) => {
  if (await eventStreamHandler(request, response)) return;
  if (await remoteMcpHandler(request, response)) return;
  await apiHandler(request, response);
});

server.listen(config.port, config.host, () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "info",
    message: "server_listening",
    address: `http://${config.host}:${config.port}`,
  }));
});
let closing = false;
async function shutdown(): Promise<void> {
  if (closing) return;
  closing = true;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await database.close();
  await memoryServer?.stop();
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
