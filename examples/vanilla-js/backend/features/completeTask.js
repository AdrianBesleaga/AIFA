import { defineFeature } from "../runtime/feature.js";

export const completeTask = defineFeature({
  name: "complete-task",
  description: "Mark one existing task as completed.",
  input: {
    taskId: "string",
  },
  output: {
    task: "Task",
  },
  capabilities: ["clock.now", "task.load", "task.save", "audit.record"],

  async execute(context) {
    const task = await context.capabilities["task.load"]({
      taskId: context.input.taskId,
    });

    if (!task) {
      return context.fail("not_found", "Task was not found", {
        taskId: context.input.taskId,
      });
    }

    if (task.completed) {
      return context.ok({ task });
    }

    const completedTask = {
      ...task,
      completed: true,
      completedAt: await context.capabilities["clock.now"](),
    };

    await context.capabilities["task.save"]({ task: completedTask });
    await context.capabilities["audit.record"]({
      type: "task.completed",
      actorId: context.actor.id,
      taskId: task.id,
    });

    return context.ok({ task: completedTask });
  },
});

