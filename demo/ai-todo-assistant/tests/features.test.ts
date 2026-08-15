import assert from "node:assert/strict";
import test from "node:test";
import { createAifaRuntime } from "../core/backend/runtime/aifa-runtime.js";
import { DomainEventType } from "../core/shared/architecture-enums.js";
import { FeatureName } from "../core/shared/generated/feature-names.js";
import {
  TaskCategory,
  TaskPriority,
  TaskStatus,
  type Task,
} from "../contexts/task-management/domain/task.js";
import { feature as createTask } from "../contexts/task-management/features/create-task/backend/feature.js";
import { feature as changeStatus } from "../contexts/task-management/features/change-task-status/backend/feature.js";
import { feature as deleteTask } from "../contexts/task-management/features/delete-task/backend/feature.js";
import { feature as listTasks } from "../contexts/task-management/features/list-tasks/backend/feature.js";
import { feature as generatePlan } from "../contexts/ai-planning/features/generate-task-plan/backend/feature.js";
import { resolveActor } from "../core/backend/auth/actor-resolver.js";
import { publishPendingEvents } from "../core/backend/outbox/outbox-publisher.js";

function fixture() {
  const actor = { tenantId: "tenant-1", userId: "user-1", scopes: [] };
  const tasks = new Map<string, Task>();
  const plans: unknown[] = [];
  let id = 0;
  const audit: string[] = [];
  const runtime = createAifaRuntime({
    TaskCreate: async ({ task }: { task: Omit<Task, "tenantId"> }) => {
      const stored = { ...task, tenantId: actor.tenantId };
      tasks.set(task.id, stored);
      return stored;
    },
    TaskList: async () => ({ tasks: [...tasks.values()] }),
    TaskLoad: async ({ taskId }: { taskId: string }) => tasks.get(taskId) ?? null,
    TaskSave: async ({ taskId, changes, expectedVersion }: { taskId: string; changes: Partial<Task>; expectedVersion: number }) => {
      const current = tasks.get(taskId);
      if (!current || current.version !== expectedVersion) return null;
      const next = { ...current, ...changes };
      tasks.set(taskId, next);
      return next;
    },
    TaskDelete: async ({ taskId, expectedVersion }: { taskId: string; expectedVersion: number }) =>
      tasks.get(taskId)?.version === expectedVersion ? tasks.delete(taskId) : false,
    IdCreate: async () => `task-${++id}`,
    ClockNow: async () => "2026-01-01T00:00:00.000Z",
    DomainEventEmit: async ({ eventType }: { eventType: DomainEventType }) => {
      audit.push(eventType);
    },
    TaskPlanCreate: async ({ plan }: { plan: unknown }) => {
      plans.push(plan);
      return plan;
    },
    AssistantGenerateTaskPlan: async () => ({
      ok: true as const,
      suggestions: [
        {
          title: "First step",
          category: TaskCategory.Work,
          priority: TaskPriority.High,
          rationale: "Start small",
        },
      ],
      provenance: {
        provider: "fixture",
        model: "test",
        promptVersion: "v1",
        latencyMs: 1,
      },
    }),
  });
  const metadata = {
    correlationId: "correlation",
    causationId: "cause",
    idempotencyKey: "1234567890123456",
  };
  return { runtime, actor, metadata, audit, plans };
}
test("task features create, list, transition, and delete within the tenant", async () => {
  const { runtime, actor, metadata, audit } = fixture();
  const created = await runtime.run(
    createTask,
    { title: "  Ship AIFA  ", category: TaskCategory.Work, priority: TaskPriority.High },
    actor,
    metadata,
  );
  assert.equal(created.ok, true);
  if (!created.ok) return;
  assert.equal(created.value.task.title, "Ship AIFA");
  const listed = await runtime.run(listTasks, {}, actor, metadata);
  assert.equal(listed.ok, true);
  if (!listed.ok) return;
  assert.equal(listed.value.tasks.length, 1);
  const changed = await runtime.run(
    changeStatus,
    { taskId: created.value.task.id, status: TaskStatus.Completed, expectedVersion: 1 },
    actor,
    metadata,
  );
  assert.equal(changed.ok, true);
  if (!changed.ok) return;
  assert.equal(changed.value.task.completedAt, "2026-01-01T00:00:00.000Z");
  const removed = await runtime.run(
    deleteTask,
    { taskId: created.value.task.id, expectedVersion: 2, confirmed: true },
    actor,
    metadata,
  );
  assert.equal(removed.ok, true);
  assert.deepEqual(audit, ["TaskCreatedV1", "TaskStatusChangedV1", "TaskDeletedV1"]);
});
test("features return explicit failures for invalid input and stale writes", async () => {
  const { runtime, actor, metadata } = fixture();
  const invalid = await runtime.run(
    createTask,
    { title: " ", category: TaskCategory.Work, priority: TaskPriority.Low },
    actor,
    metadata,
  );
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.error.code, "InvalidInput");
  const stale = await runtime.run(
    changeStatus,
    { taskId: "missing", status: TaskStatus.Completed, expectedVersion: 1 },
    actor,
    metadata,
  );
  assert.equal(stale.ok, false);
  if (!stale.ok) assert.equal(stale.error.code, "NotFound");
});
test("AI planning stays provider-neutral and audits each plan", async () => {
  const { runtime, actor, metadata, audit, plans } = fixture();
  const result = await runtime.run(
    generatePlan,
    {
      goal: "Prepare launch",
      category: TaskCategory.Work,
      priority: TaskPriority.High,
    },
    actor,
    metadata,
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.suggestions[0]?.title, "First step");
  assert.equal(plans.length, 1);
  assert.deepEqual(audit, ["TaskPlanGeneratedV1"]);
  assert.equal(FeatureName.GenerateTaskPlan, generatePlan.name);
});
test("actor resolution accepts only configured scope values", async () => {
  assert.deepEqual(
    await resolveActor({
      "x-aifa-tenant-id": "tenant",
      "x-aifa-user-id": "user",
      "x-aifa-scopes": "TaskRead,not-real",
    }),
    { tenantId: "tenant", userId: "user", scopes: ["TaskRead"] },
  );
});
test("runtime rejects missing and undeclared capability access without returning a fake value", async () => {
  const actor = { tenantId: "tenant", userId: "user", scopes: [] };
  const metadata = { correlationId: "c", causationId: "c" };
  const missing = await createAifaRuntime({}).run(
    {
      name: FeatureName.ListTasks,
      capabilities: ["TaskList" as never],
      execute: async (context) => context.ok({}),
    },
    {},
    actor,
    metadata,
  );
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.error.code, "CapabilityMissing");

  const undeclared = await createAifaRuntime({ ClockNow: async () => "now" }).run(
    {
      name: FeatureName.ListTasks,
      capabilities: [],
      execute: async (context) => {
        await (context.capabilities as { ClockNow(): Promise<string> }).ClockNow();
        return context.ok({});
      },
    },
    {},
    actor,
    metadata,
  );
  assert.equal(undeclared.ok, false);
  if (!undeclared.ok) assert.equal(undeclared.error.code, "CapabilityNotAllowed");
});
test("outbox delivery marks successes and leaves failures retryable", async () => {
  const delivered: unknown[] = [];
  const failed: unknown[] = [];
  const count = await publishPendingEvents(
    {
      claim: async () => [
        { _id: 1, claimToken: "one", eventId: "e1", eventType: "TaskCreatedV1", tenantId: "a", occurredAt: "now", attempts: 1 },
        { _id: 2, claimToken: "two", eventId: "e2", eventType: "TaskDeletedV1", tenantId: "a", occurredAt: "now", attempts: 1 },
      ],
      markDelivered: async (id) => {
        delivered.push(id);
      },
      markFailed: async (id) => {
        failed.push(id);
      },
    },
    async (event) => {
      if (event._id === 2) throw new Error("downstream unavailable");
    },
  );
  assert.equal(count, 2);
  assert.deepEqual(delivered, [1]);
  assert.deepEqual(failed, [2]);
});
