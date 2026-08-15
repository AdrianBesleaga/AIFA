import { defineFeature } from "../runtime/feature.js";

export const reopenTask = defineFeature({
  name: "reopen-task",
  description: "Mark one completed task as active again.",
  input: {
    taskId: "string",
  },
  output: {
    task: "Task",
  },
  capabilities: ["task.load", "task.save", "audit.record"],

  async execute(context) {
    const task = await context.capabilities["task.load"]({
      taskId: context.input.taskId,
    });

    if (!task) {
      return context.fail("not_found", "Task was not found", {
        taskId: context.input.taskId,
      });
    }

    if (!task.completed) {
      return context.ok({ task });
    }

    const reopenedTask = {
      ...task,
      completed: false,
      completedAt: null,
    };

    await context.capabilities["task.save"]({ task: reopenedTask });
    await context.capabilities["audit.record"]({
      type: "task.reopened",
      actorId: context.actor.id,
      taskId: task.id,
    });

    return context.ok({ task: reopenedTask });
  },
});

