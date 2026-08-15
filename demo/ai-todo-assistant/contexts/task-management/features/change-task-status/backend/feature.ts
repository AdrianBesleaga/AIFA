import {
  CapabilityName,
  DomainEventType,
  ErrorCode,
} from "../../../../../core/shared/architecture-enums.js";
import { FeatureName } from "../../../../../core/shared/generated/feature-names.js";
import type { AifaFeature } from "../../../../../core/shared/aifa.js";
import { TaskStatus, transitionTaskStatus } from "../../../domain/task.js";
import type { TaskCapabilities } from "../../../domain/task-capabilities.js";
import { toTaskView, type TaskView } from "../../../contracts/v1/task-view.js";
export interface ChangeTaskStatusInput {
  taskId: string;
  status: TaskStatus;
  expectedVersion: number;
}
type ChangeStatusCapabilities = Pick<
  TaskCapabilities,
  "TaskLoad" | "TaskSave" | "ClockNow" | "DomainEventEmit"
>;
export const feature: AifaFeature<ChangeTaskStatusInput, { task: TaskView }, ChangeStatusCapabilities> = {
  name: FeatureName.ChangeTaskStatus,
  capabilities: [
    CapabilityName.TaskLoad,
    CapabilityName.TaskSave,
    CapabilityName.ClockNow,
    CapabilityName.DomainEventEmit,
  ],
  async execute(context) {
    const task = await context.capabilities.TaskLoad({ taskId: context.input.taskId });
    if (!task) return context.fail(ErrorCode.NotFound, "Task was not found");
    if (task.version !== context.input.expectedVersion)
      return context.fail(ErrorCode.VersionConflict, "Task changed", { task: toTaskView(task) });
    const transition = transitionTaskStatus(
      task,
      context.input.status,
      await context.capabilities.ClockNow(),
    );
    if (!transition.ok)
      return context.fail(ErrorCode.InvalidStatusTransition, "Task status transition is not allowed", {
        from: transition.from,
        to: transition.to,
      });
    const next = transition.task;
    if (next === task) return context.ok({ task: toTaskView(task) });
    const saved = await context.capabilities.TaskSave({
      taskId: task.id,
      expectedVersion: task.version,
      changes: {
        status: next.status,
        version: next.version,
        updatedAt: next.updatedAt,
        completedAt: next.completedAt,
      },
    });
    if (!saved) {
      const current = await context.capabilities.TaskLoad({ taskId: task.id });
      return context.fail(ErrorCode.VersionConflict, "Task changed", {
        ...(current ? { task: toTaskView(current) } : {}),
      });
    }
    await context.capabilities.DomainEventEmit({
      eventType: DomainEventType.TaskStatusChangedV1,
      data: {
        taskId: task.id,
        previousStatus: task.status,
        status: saved.status,
        version: saved.version,
      },
    });
    return context.ok({ task: toTaskView(saved) });
  },
};
