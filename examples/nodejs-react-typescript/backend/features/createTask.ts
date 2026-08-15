import { defineFeature } from "../runtime/feature";
import type { Priority, Task } from "../types";

interface CreateTaskInput { title?: string; priority?: string; }
export const createTask = defineFeature<CreateTaskInput, { task: Task }>({
  name: "create-task", description: "Create one task with a non-empty title and optional priority.",
  input: { title: "string", priority: "low | medium | high" }, output: { task: "Task" },
  capabilities: ["id.create", "clock.now", "task.create", "audit.record"],
  async execute(context) {
    const title = context.input.title?.trim() ?? "";
    if (!title) return context.fail("invalid_title", "Task title is required");
    const task: Task = { id: await context.capabilities["id.create"](), title, priority: normalizePriority(context.input.priority), completed: false, createdAt: await context.capabilities["clock.now"](), completedAt: null };
    await context.capabilities["task.create"]({ task });
    await context.capabilities["audit.record"]({ type: "task.created", actorId: context.actor.id, taskId: task.id });
    return context.ok({ task });
  },
});
function normalizePriority(priority: string | undefined): Priority { return priority === "low" || priority === "medium" || priority === "high" ? priority : "medium"; }
