import { defineFeature } from "../runtime/feature";
import type { Task } from "../types";
export const listTasks = defineFeature<Record<string, never>, { tasks: Task[] }>({
  name: "list-tasks", description: "List tasks in creation order.", input: {}, output: { tasks: "Task[]" }, capabilities: ["task.list"],
  async execute(context) { return context.ok({ tasks: await context.capabilities["task.list"]() }); },
});
