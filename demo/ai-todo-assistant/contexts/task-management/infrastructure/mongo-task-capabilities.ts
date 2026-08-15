import type { ClientSession, Db } from "mongodb";
import type { Actor } from "../../../core/shared/aifa.js";
import type { Task } from "../domain/task.js";
import type { TaskPersistenceCapabilities } from "../domain/task-capabilities.js";

function withoutMongoId(document: Task & { _id?: unknown }): Task {
  const { _id: _mongoId, ...task } = document;
  return task;
}

export function createMongoTaskCapabilities(
  database: Db,
  actor: Actor,
  session?: ClientSession,
): TaskPersistenceCapabilities {
  const tasks = database.collection<Task>("tasks");
  return {
    async TaskCreate({ task }) {
      const tenantTask: Task = { ...task, tenantId: actor.tenantId };
      await tasks.insertOne(tenantTask, { session });
      return withoutMongoId(tenantTask);
    },
    async TaskList({ category, status, cursor, limit }) {
      const page = await tasks
        .find(
          {
            tenantId: actor.tenantId,
            ...(category ? { category } : {}),
            ...(status ? { status } : {}),
            ...(cursor
              ? {
                  $or: [
                    { createdAt: { $lt: cursor.createdAt } },
                    { createdAt: cursor.createdAt, id: { $lt: cursor.id } },
                  ],
                }
              : {}),
          },
          { session },
        )
        .sort({ createdAt: -1, id: -1 })
        .limit(limit + 1)
        .toArray();
      const hasNextPage = page.length > limit;
      const selected = hasNextPage ? page.slice(0, limit) : page;
      const last = selected.at(-1);
      return {
        tasks: selected.map(withoutMongoId),
        ...(hasNextPage && last
          ? {
              nextCursor: Buffer.from(
                JSON.stringify({ createdAt: last.createdAt, id: last.id }),
              ).toString("base64url"),
            }
          : {}),
      };
    },
    async TaskLoad({ taskId }) {
      const task = await tasks.findOne({ tenantId: actor.tenantId, id: taskId }, { session });
      return task ? withoutMongoId(task) : null;
    },
    async TaskSave({ taskId, expectedVersion, changes }) {
      const task = await tasks.findOneAndUpdate(
          { tenantId: actor.tenantId, id: taskId, version: expectedVersion },
          { $set: changes },
          { returnDocument: "after", session },
        );
      return task ? withoutMongoId(task) : null;
    },
    async TaskDelete({ taskId, expectedVersion }) {
      return (
        (await tasks.deleteOne(
          { tenantId: actor.tenantId, id: taskId, version: expectedVersion },
          { session },
        )).deletedCount === 1
      );
    },
  };
}

export async function ensureTaskManagementIndexes(database: Db): Promise<void> {
  await Promise.all([
    database
      .collection<Task>("tasks")
      .createIndex({ tenantId: 1, id: 1 }, { unique: true, name: "tenant_task_id" }),
    database
      .collection<Task>("tasks")
      .createIndex(
        { tenantId: 1, category: 1, status: 1, createdAt: -1, id: -1 },
        { name: "tenant_task_filters" },
      ),
  ]);
}
