import assert from "node:assert/strict";
import test from "node:test";

import { completeTask } from "../backend/features/completeTask.js";
import { createTask } from "../backend/features/createTask.js";
import { deleteTask } from "../backend/features/deleteTask.js";
import { listTasks } from "../backend/features/listTasks.js";
import { reopenTask } from "../backend/features/reopenTask.js";
import { createAifaRuntime } from "../backend/runtime/aifaRuntime.js";
import { createMemoryTaskStore } from "../backend/storage/memoryTaskStore.js";

const actor = {
  id: "test-user",
};

function createRuntime(seed = []) {
  let nextId = 1;

  return createAifaRuntime({
    taskStore: createMemoryTaskStore(seed),
    idFactory: {
      next() {
        const id = `task-${nextId}`;
        nextId += 1;
        return id;
      },
    },
    clock: () => new Date("2026-08-14T10:00:00.000Z"),
  });
}

test("creates an active task", async () => {
  const runtime = createRuntime();

  const result = await runtime.run(createTask, { title: "  Write AIFA docs  " }, actor);

  assert.equal(result.ok, true);
  assert.equal(result.value.task.id, "task-1");
  assert.equal(result.value.task.title, "Write AIFA docs");
  assert.equal(result.value.task.completed, false);
  assert.equal(result.value.task.completedAt, null);
  assert.equal(runtime.auditLog[0].type, "task.created");
});

test("rejects empty task titles", async () => {
  const runtime = createRuntime();

  const result = await runtime.run(createTask, { title: "   " }, actor);

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "invalid_title");
});

test("lists tasks in creation order", async () => {
  const runtime = createRuntime([
    createSeedTask("task-2", "Second", "2026-08-14T10:02:00.000Z"),
    createSeedTask("task-1", "First", "2026-08-14T10:01:00.000Z"),
  ]);

  const result = await runtime.run(listTasks, {}, actor);

  assert.equal(result.ok, true);
  assert.deepEqual(
    result.value.tasks.map((task) => task.id),
    ["task-1", "task-2"],
  );
});

test("completes an active task", async () => {
  const runtime = createRuntime([createSeedTask("task-1", "Ship example")]);

  const result = await runtime.run(completeTask, { taskId: "task-1" }, actor);

  assert.equal(result.ok, true);
  assert.equal(result.value.task.completed, true);
  assert.equal(result.value.task.completedAt, "2026-08-14T10:00:00.000Z");
  assert.equal(runtime.auditLog[0].type, "task.completed");
});

test("reopens a completed task", async () => {
  const runtime = createRuntime([
    {
      ...createSeedTask("task-1", "Revisit article"),
      completed: true,
      completedAt: "2026-08-14T09:00:00.000Z",
    },
  ]);

  const result = await runtime.run(reopenTask, { taskId: "task-1" }, actor);

  assert.equal(result.ok, true);
  assert.equal(result.value.task.completed, false);
  assert.equal(result.value.task.completedAt, null);
  assert.equal(runtime.auditLog[0].type, "task.reopened");
});

test("deletes an existing task", async () => {
  const runtime = createRuntime([createSeedTask("task-1", "Delete me")]);

  const result = await runtime.run(deleteTask, { taskId: "task-1" }, actor);
  const listResult = await runtime.run(listTasks, {}, actor);

  assert.equal(result.ok, true);
  assert.equal(result.value.deleted, true);
  assert.equal(listResult.value.tasks.length, 0);
  assert.equal(runtime.auditLog[0].type, "task.deleted");
});

test("returns not_found for missing task actions", async () => {
  const runtime = createRuntime();

  const completeResult = await runtime.run(completeTask, { taskId: "missing" }, actor);
  const reopenResult = await runtime.run(reopenTask, { taskId: "missing" }, actor);
  const deleteResult = await runtime.run(deleteTask, { taskId: "missing" }, actor);

  assert.equal(completeResult.error.code, "not_found");
  assert.equal(reopenResult.error.code, "not_found");
  assert.equal(deleteResult.error.code, "not_found");
});

function createSeedTask(id, title, createdAt = "2026-08-14T10:00:00.000Z") {
  return {
    id,
    title,
    completed: false,
    createdAt,
    completedAt: null,
  };
}
