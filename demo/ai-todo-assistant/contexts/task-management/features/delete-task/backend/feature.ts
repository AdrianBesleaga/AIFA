import {
  CapabilityName,
  DomainEventType,
  ErrorCode,
} from "../../../../../core/shared/architecture-enums.js";
import { FeatureName } from "../../../../../core/shared/generated/feature-names.js";
import type { AifaFeature } from "../../../../../core/shared/aifa.js";
import type { TaskCapabilities } from "../../../domain/task-capabilities.js";
import type {
  DeleteTaskInputV1,
  DeleteTaskOutputV1,
} from "../../../../../core/shared/generated/contracts.js";
export type DeleteTaskInput = DeleteTaskInputV1;
type DeleteTaskCapabilities = Pick<
  TaskCapabilities,
  "TaskLoad" | "TaskDelete" | "DomainEventEmit"
>;
export const feature: AifaFeature<DeleteTaskInput, DeleteTaskOutputV1, DeleteTaskCapabilities> = {
  name: FeatureName.DeleteTask,
  capabilities: [CapabilityName.TaskLoad, CapabilityName.TaskDelete, CapabilityName.DomainEventEmit],
  async execute(context) {
    if (!context.input.confirmed)
      return context.fail(ErrorCode.ConfirmationRequired, "Deletion requires confirmation");
    const current = await context.capabilities.TaskLoad({ taskId: context.input.taskId });
    if (!current) return context.fail(ErrorCode.NotFound, "Task was not found");
    if (current.version !== context.input.expectedVersion)
      return context.fail(ErrorCode.VersionConflict, "Task changed", { version: current.version });
    const deleted = await context.capabilities.TaskDelete({
      taskId: current.id,
      expectedVersion: current.version,
    });
    if (!deleted) {
      const latest = await context.capabilities.TaskLoad({ taskId: current.id });
      return context.fail(ErrorCode.VersionConflict, "Task changed", {
        ...(latest ? { version: latest.version } : {}),
      });
    }
    await context.capabilities.DomainEventEmit({
      eventType: DomainEventType.TaskDeletedV1,
      data: { taskId: current.id },
    });
    return context.ok({ deleted: true });
  },
};
