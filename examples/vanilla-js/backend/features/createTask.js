import { defineFeature } from "../runtime/feature.js";

export const createTask = defineFeature({
  name: "create-task",
  description: "Create one task with a non-empty title.",
  input: {
    title: "string",
  },
  output: {
    task: "Task",
  },
  capabilities: ["id.create", "clock.now", "task.create", "audit.record"],

  async execute(context) {
    const title = context.input.title?.trim() ?? "";

    if (!title) {
      return context.fail("invalid_title", "Task title is required");
    }

    const now = await context.capabilities["clock.now"]();
    const task = {
      id: await context.capabilities["id.create"](),
      title,
      completed: false,
      createdAt: now,
      completedAt: null,
    };

    await context.capabilities["task.create"]({ task });
    await context.capabilities["audit.record"]({
      type: "task.created",
      actorId: context.actor.id,
      taskId: task.id,
    });

    return context.ok({ task });
  },
});
