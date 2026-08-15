import { defineFeature } from "../runtime/feature";
interface TaskIdInput {
  taskId: string;
}
export const deleteTask = defineFeature<TaskIdInput, { deleted: boolean }>({
  name: "delete-task",
  description: "Delete one existing task.",
  input: { taskId: "string" },
  output: { deleted: "boolean" },
  capabilities: ["task.load", "task.delete", "audit.record"],
  async execute(context) {
    const task = await context.capabilities["task.load"]({ taskId: context.input.taskId });
    if (!task)
      return context.fail("not_found", "Task was not found", { taskId: context.input.taskId });
    await context.capabilities["task.delete"]({ taskId: task.id });
    await context.capabilities["audit.record"]({
      type: "task.deleted",
      actorId: context.actor.id,
      taskId: task.id,
    });
    return context.ok({ deleted: true });
  },
});
