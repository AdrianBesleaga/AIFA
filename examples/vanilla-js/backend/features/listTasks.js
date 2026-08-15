import { defineFeature } from "../runtime/feature.js";

export const listTasks = defineFeature({
  name: "list-tasks",
  description: "List tasks in creation order.",
  input: {},
  output: {
    tasks: "Task[]",
  },
  capabilities: ["task.list"],

  async execute(context) {
    const tasks = await context.capabilities["task.list"]();

    return context.ok({ tasks });
  },
});
