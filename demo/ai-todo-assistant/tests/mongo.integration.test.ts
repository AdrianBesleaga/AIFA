import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { MongoClient } from "mongodb";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createMongoIdempotencyStore } from "../core/backend/idempotency/mongo-idempotency.js";
import { FeatureName } from "../core/shared/generated/feature-names.js";
import { DomainEventType, OutboxStatus } from "../core/shared/architecture-enums.js";
import { createMongoOutboxStore } from "../core/backend/outbox/mongo-outbox.js";
import { createMongoPlatformCapabilities } from "../core/backend/runtime/mongo-platform-capabilities.js";
import { discoverFeatureManifests } from "../core/backend/discovery/discover-features.js";
import {
  createMongoTaskCapabilities,
  ensureTaskManagementIndexes,
} from "../contexts/task-management/infrastructure/mongo-task-capabilities.js";
import {
  TaskCategory,
  TaskPriority,
  TaskStatus,
  type Task,
} from "../contexts/task-management/domain/task.js";
test("Mongo task capability enforces tenant isolation and optimistic concurrency", async () => {
  const memoryServer = process.env.MONGODB_URI
    ? undefined
    : await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const client = new MongoClient(process.env.MONGODB_URI ?? memoryServer!.getUri());
  const database = client.db(`ai_todo_test_${randomUUID().replaceAll("-", "")}`);
  try {
    await client.connect();
    await ensureTaskManagementIndexes(database);
    const actorA = { tenantId: "tenant-a", userId: "user-a", scopes: [] };
    const actorB = { tenantId: "tenant-b", userId: "user-b", scopes: [] };
    const capabilities = createMongoTaskCapabilities(database, actorA);
    const task: Task = {
      id: "task-1",
      tenantId: "tenant-a",
      title: "Integration task",
      category: TaskCategory.Work,
      priority: TaskPriority.High,
      status: TaskStatus.Todo,
      version: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      completedAt: null,
    };
    const { tenantId: _tenantId, ...taskCommand } = task;
    await capabilities.TaskCreate({ task: taskCommand });
    assert.equal((await capabilities.TaskList({ limit: 100 })).tasks.length, 1);
    assert.equal(
      (await createMongoTaskCapabilities(database, actorB).TaskList({ limit: 100 })).tasks.length,
      0,
    );
    assert.equal(
      await capabilities.TaskSave({
        taskId: task.id,
        changes: {
          version: 2,
          status: TaskStatus.Completed,
          updatedAt: task.updatedAt,
          completedAt: task.updatedAt,
        },
        expectedVersion: 0,
      }),
      null,
    );
    assert.equal(
      (
        await capabilities.TaskSave({
          taskId: task.id,
          changes: {
            version: 2,
            status: TaskStatus.Completed,
            updatedAt: task.updatedAt,
            completedAt: task.updatedAt,
          },
          expectedVersion: 1,
        })
      )?.version,
      2,
    );
    const malicious = await capabilities.TaskCreate({
      task: { ...taskCommand, id: "tenant-override", tenantId: "tenant-b" } as never,
    });
    assert.equal(malicious.tenantId, actorA.tenantId);
    assert.equal(
      await createMongoTaskCapabilities(database, actorB).TaskLoad({ taskId: malicious.id }),
      null,
    );
    const rollbackTask = { ...task, id: "rolled-back" };
    const session = client.startSession();
    try {
      await assert.rejects(
        session.withTransaction(async () => {
          const { tenantId: _rollbackTenant, ...rollbackCommand } = rollbackTask;
          await createMongoTaskCapabilities(database, actorA, session).TaskCreate({ task: rollbackCommand });
          throw new Error("simulate audit failure");
        }),
      );
    } finally {
      await session.endSession();
    }
    assert.equal(
      await capabilities.TaskLoad({ taskId: rollbackTask.id }),
      null,
    );
    const idempotency = createMongoIdempotencyStore(database);
    await idempotency.ensureIndexes();
    const command = {
      tenantId: "tenant-a",
      actorId: "user-a",
      featureName: FeatureName.CreateTask,
      idempotencyKey: "1234567890123456",
      inputFingerprint: "same-input",
    };
    const claims = await Promise.all([idempotency.claim(command), idempotency.claim(command)]);
    assert.deepEqual(claims.map((claim) => claim.kind).sort(), ["claimed", "in-progress"]);
    const claimed = claims.find((claim) => claim.kind === "claimed");
    if (!claimed || claimed.kind !== "claimed") throw new Error("Expected an idempotency claim");
    await idempotency.complete(command, claimed.executionId, {
      ok: true,
      value: { accepted: true },
    });
    const replay = await idempotency.claim(command);
    assert.equal(replay.kind, "completed");
    assert.equal(
      (await idempotency.claim({ ...command, inputFingerprint: "other-input" })).kind,
      "key-reused",
    );
    const interrupted = { ...command, idempotencyKey: "abcdefghijklmnop" };
    const firstAttempt = await idempotency.claim(interrupted);
    if (firstAttempt.kind !== "claimed") throw new Error("Expected initial claim");
    await database
      .collection("idempotency_records")
      .updateOne(
        { idempotencyKey: interrupted.idempotencyKey },
        { $set: { leaseExpiresAt: new Date(0).toISOString() } },
      );
    const recoveredAttempt = await idempotency.claim(interrupted);
    assert.equal(recoveredAttempt.kind, "claimed");
    if (recoveredAttempt.kind !== "claimed") throw new Error("Expected recovered claim");
    await assert.rejects(
      idempotency.complete(interrupted, firstAttempt.executionId, { ok: true, value: {} }),
      /execution fence/,
    );
    assert.equal((await idempotency.claim(interrupted)).kind, "in-progress");
    await idempotency.complete(interrupted, recoveredAttempt.executionId, { ok: true, value: {} });
    assert.equal((await idempotency.claim(interrupted)).kind, "completed");

    const preparedCommand = { ...command, idempotencyKey: "prepared-command-1234" };
    const preparedAttempt = await idempotency.claim({
      ...preparedCommand,
      commandInput: { goal: "Recover this plan" },
    });
    if (preparedAttempt.kind !== "claimed") throw new Error("Expected prepared command claim");
    await idempotency.heartbeat(preparedCommand, preparedAttempt.executionId);
    await idempotency.savePreparedCapability(
      preparedCommand,
      preparedAttempt.executionId,
      "AssistantGenerateTaskPlan",
      { ok: true, suggestions: [{ title: "Durable provider result" }] },
    );
    await database.collection("idempotency_records").updateOne(
      { idempotencyKey: preparedCommand.idempotencyKey },
      { $set: { leaseExpiresAt: new Date(0).toISOString() } },
    );
    const resumedPreparedAttempt = await idempotency.claim(preparedCommand);
    assert.equal(resumedPreparedAttempt.kind, "claimed");
    if (resumedPreparedAttempt.kind !== "claimed") throw new Error("Expected recovered prepared claim");
    assert.deepEqual(resumedPreparedAttempt.preparedCapabilities.AssistantGenerateTaskPlan, {
      ok: true,
      suggestions: [{ title: "Durable provider result" }],
    });
    await assert.rejects(
      idempotency.savePreparedCapability(
        preparedCommand,
        preparedAttempt.executionId,
        "AssistantGenerateTaskPlan",
        { ok: false },
      ),
      /execution fence/,
    );

    const eventManifest = (await discoverFeatureManifests(
      new URL("../contexts", import.meta.url).pathname,
    )).find(({ name }) => name === FeatureName.CreateTask);
    assert.ok(eventManifest?.backend.contract);
    await createMongoPlatformCapabilities(
      database,
      actorA,
      {
        correlationId: "correlation",
        causationId: "cause",
        idempotencyKey: "event-command-1234",
      },
      undefined,
      eventManifest.backend.contract.validateEvent,
    ).DomainEventEmit({ eventType: DomainEventType.TaskCreatedV1, data: { taskId: task.id } });
    const auditEvent = await database
      .collection("audit_events")
      .findOne({ eventType: "TaskCreatedV1" }, { projection: { _id: 0 } });
    assert.deepEqual(eventManifest.backend.contract.validateEvent(auditEvent), []);
    const storedOutbox = await database.collection("outbox_events").findOne({ "event.eventId": auditEvent?.eventId });
    assert.deepEqual(eventManifest.backend.contract.validateEvent(storedOutbox?.event), []);

    await database.collection("outbox_events").deleteMany({});
    await database.collection("outbox_events").insertOne({
      event: {
        eventId: "concurrent-event",
        eventType: "TaskCreatedV1",
        tenantId: actorA.tenantId,
        occurredAt: new Date().toISOString(),
      },
      delivery: {
        status: OutboxStatus.Pending,
        attempts: 0,
        availableAt: new Date(0).toISOString(),
      },
    });
    const outbox = createMongoOutboxStore(database, 10);
    const concurrentClaims = await Promise.all([
      outbox.claim(1, "worker-a"),
      outbox.claim(1, "worker-b"),
    ]);
    assert.equal(
      concurrentClaims.flat().filter(({ eventId }) => eventId === "concurrent-event").length,
      1,
    );
    await database.collection("outbox_events").updateOne(
      { "event.eventId": "concurrent-event" },
      { $set: { "delivery.leaseExpiresAt": new Date(0).toISOString() } },
    );
    assert.equal((await outbox.claim(10, "recovery-worker")).some(({ eventId }) => eventId === "concurrent-event"), true);
  } finally {
    await database.dropDatabase();
    await client.close();
    await memoryServer?.stop();
  }
});
