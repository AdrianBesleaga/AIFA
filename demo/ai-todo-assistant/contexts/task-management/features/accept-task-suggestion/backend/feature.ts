import {
  CapabilityName,
  DomainEventType,
  ErrorCode,
} from "../../../../../core/shared/architecture-enums.js";
import { FeatureName } from "../../../../../core/shared/generated/feature-names.js";
import type {
  AcceptTaskSuggestionOutputV1,
  TaskPlanSuggestionV1,
} from "../../../../../core/shared/generated/contracts.js";
import type { AifaFeature } from "../../../../../core/shared/aifa.js";
import {
  createTaskDraft,
  normalizeTaskTitle,
} from "../../../domain/task.js";
import type { TaskCapabilities } from "../../../domain/task-capabilities.js";
import { toTaskView } from "../../../contracts/v1/task-view.js";
import {
  parseTaskCategory,
  parseTaskPriority,
} from "../../../contracts/v1/task-taxonomy.js";

type AcceptTaskSuggestionCapabilities = Pick<
  TaskCapabilities,
  "TaskCreate" | "IdCreate" | "ClockNow" | "DomainEventEmit"
>;

export const feature: AifaFeature<
  TaskPlanSuggestionV1,
  AcceptTaskSuggestionOutputV1,
  AcceptTaskSuggestionCapabilities
> = {
  name: FeatureName.AcceptTaskSuggestion,
  capabilities: [
    CapabilityName.TaskCreate,
    CapabilityName.IdCreate,
    CapabilityName.ClockNow,
    CapabilityName.DomainEventEmit,
  ],
  async execute(context) {
    const title = normalizeTaskTitle(context.input.title);
    if (!title) return context.fail(ErrorCode.InvalidInput, "Task title is required");
    const category = parseTaskCategory(context.input.category);
    const priority = parseTaskPriority(context.input.priority);
    if (!category || !priority)
      return context.fail(ErrorCode.InvalidInput, "Task taxonomy value is invalid");
    const now = await context.capabilities.ClockNow();
    const task = createTaskDraft({
      id: await context.capabilities.IdCreate(),
      title,
      category,
      priority,
      now,
    });
    const created = await context.capabilities.TaskCreate({ task });
    await context.capabilities.DomainEventEmit({
      eventType: DomainEventType.TaskCreatedV1,
      data: { taskId: created.id },
    });
    return context.ok({ task: toTaskView(created) });
  },
};
