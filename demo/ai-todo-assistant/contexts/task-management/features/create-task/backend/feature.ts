import {
  CapabilityName,
  DomainEventType,
  ErrorCode,
} from "../../../../../core/shared/architecture-enums.js";
import { FeatureName } from "../../../../../core/shared/generated/feature-names.js";
import type { AifaFeature } from "../../../../../core/shared/aifa.js";
import { TaskCategory, TaskPriority, TaskStatus, type Task } from "../../../domain/task.js";
import type { TaskCapabilities } from "../../../domain/task-capabilities.js";
import { toTaskView, type TaskView } from "../../../contracts/v1/task-view.js";

export interface CreateTaskInput {
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
}
type CreateTaskCapabilities = Pick<
  TaskCapabilities,
  "TaskCreate" | "IdCreate" | "ClockNow" | "DomainEventEmit"
>;
export const feature: AifaFeature<CreateTaskInput, { task: TaskView }, CreateTaskCapabilities> = {
  name: FeatureName.CreateTask,
  capabilities: [
    CapabilityName.TaskCreate,
    CapabilityName.IdCreate,
    CapabilityName.ClockNow,
    CapabilityName.DomainEventEmit,
  ],
  async execute(context) {
    const title = context.input.title.trim();
    if (!title) return context.fail(ErrorCode.InvalidInput, "Task title is required");
    const now = await context.capabilities.ClockNow();
    const task: Omit<Task, "tenantId"> = {
      id: await context.capabilities.IdCreate(),
      title,
      category: context.input.category,
      priority: context.input.priority,
      status: TaskStatus.Todo,
      version: 1,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    const created = await context.capabilities.TaskCreate({ task });
    await context.capabilities.DomainEventEmit({
      eventType: DomainEventType.TaskCreatedV1,
      data: { taskId: created.id },
    });
    return context.ok({ task: toTaskView(created) });
  },
};
