import assert from "node:assert/strict";
import test from "node:test";
import { eventConsumers as createTaskEventConsumers } from "../contexts/task-management/features/create-task/frontend/contribution.js";
import { TaskCacheTag, TaskQueryName } from "../contexts/task-management/contracts/v1/task-cache.js";
import { DomainEventType } from "../core/shared/architecture-enums.js";
import { FrontendEventRegistry } from "../core/frontend/events/event-registry.js";
import { QueryClient } from "../core/frontend/query/query-client.js";

async function settle(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

test("semantic tag invalidation refetches every active dependent query", async () => {
  const client = new QueryClient();
  let listRequests = 0;
  let countRequests = 0;
  const listHash = client.configure({
    key: [TaskQueryName.List, "", ""],
    tags: [TaskCacheTag.Collection],
    queryFn: async () => ++listRequests,
  });
  const countHash = client.configure({
    key: ["task-management/v1/task-count"],
    tags: [TaskCacheTag.Collection],
    queryFn: async () => ++countRequests,
  });
  const unsubscribeList = client.subscribe(listHash, () => undefined);
  const unsubscribeCount = client.subscribe(countHash, () => undefined);
  await settle();

  assert.equal(client.getSnapshot<number>(listHash).data, 1);
  assert.equal(client.getSnapshot<number>(countHash).data, 1);

  await Promise.all([
    client.invalidateTags([TaskCacheTag.Collection]),
    client.invalidateTags([TaskCacheTag.Collection]),
  ]);

  assert.equal(listRequests, 2, "duplicate invalidations deduplicate the active list request");
  assert.equal(countRequests, 2, "count updates without a component-to-component call");
  assert.equal(client.getSnapshot<number>(listHash).data, 2);
  assert.equal(client.getSnapshot<number>(countHash).data, 2);
  unsubscribeList();
  unsubscribeCount();
});

test("TaskCreatedV1 consumer invalidates the task collection contract", async () => {
  const client = new QueryClient();
  const registry = new FrontendEventRegistry();
  createTaskEventConsumers.forEach((consumer) => registry.register(consumer));
  let requests = 0;
  const hash = client.configure({
    key: [TaskQueryName.List, "", ""],
    tags: [TaskCacheTag.Collection],
    queryFn: async () => ++requests,
  });
  const unsubscribe = client.subscribe(hash, () => undefined);
  await settle();

  await registry.dispatch(
    {
      eventId: "event-1",
      eventType: DomainEventType.TaskCreatedV1,
      schemaVersion: 1,
      tenantId: "tenant-1",
      actorId: "actor-1",
      correlationId: "correlation-1",
      causationId: "causation-1",
      idempotencyKey: "idempotency-1",
      taskId: "task-1",
      occurredAt: "2026-08-15T12:00:00.000Z",
    },
    { queryClient: client },
  );

  assert.equal(requests, 2);
  assert.equal(client.getSnapshot<number>(hash).data, 2);
  unsubscribe();
});

test("frontend event consumers reject unsupported contract versions", async () => {
  const registry = new FrontendEventRegistry();
  createTaskEventConsumers.forEach((consumer) => registry.register(consumer));
  await assert.rejects(
    registry.dispatch(
      {
        eventType: DomainEventType.TaskCreatedV1,
        schemaVersion: 2,
        tenantId: "tenant-1",
      },
      { queryClient: new QueryClient() },
    ),
    /failed consumer validation/,
  );
});
