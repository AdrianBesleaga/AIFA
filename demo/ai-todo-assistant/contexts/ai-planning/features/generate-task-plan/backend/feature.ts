import {
  CapabilityName,
  DomainEventType,
  ErrorCode,
} from "../../../../../core/shared/architecture-enums.js";
import { FeatureName } from "../../../../../core/shared/generated/feature-names.js";
import type { AifaFeature } from "../../../../../core/shared/aifa.js";
import type {
  AiPlanningCapabilities,
  GenerateTaskPlanRequest,
  TaskPlanSuggestion,
} from "../../../domain/task-planning.js";
import { TaskPlanStatus } from "../../../domain/task-plan.js";
export type GenerateTaskPlanInput = GenerateTaskPlanRequest;
type GenerateTaskPlanCapabilities = Pick<
  AiPlanningCapabilities,
  "AssistantGenerateTaskPlan" | "TaskPlanCreate" | "IdCreate" | "ClockNow" | "DomainEventEmit"
>;
export const feature: AifaFeature<
  GenerateTaskPlanInput,
  {
    suggestions: TaskPlanSuggestion[];
    provenance: { provider: string; model: string; promptVersion: string; latencyMs: number };
  },
  GenerateTaskPlanCapabilities
> = {
  name: FeatureName.GenerateTaskPlan,
  capabilities: [
    CapabilityName.AssistantGenerateTaskPlan,
    CapabilityName.TaskPlanCreate,
    CapabilityName.IdCreate,
    CapabilityName.ClockNow,
    CapabilityName.DomainEventEmit,
  ],
  async execute(context) {
    const goal = context.input.goal.trim();
    if (!goal) return context.fail(ErrorCode.InvalidInput, "A goal is required");
    const generated = await context.capabilities.AssistantGenerateTaskPlan({
      ...context.input,
      goal,
    });
    if (!generated.ok)
      return context.fail(
        generated.code === "AssistantResponseInvalid"
          ? ErrorCode.AssistantResponseInvalid
          : ErrorCode.ProviderUnavailable,
        generated.message,
      );
    const plan = await context.capabilities.TaskPlanCreate({
      plan: {
        id: await context.capabilities.IdCreate(),
        goal,
        suggestions: generated.suggestions,
        status: TaskPlanStatus.Generated,
        createdAt: await context.capabilities.ClockNow(),
        provider: generated.provenance.provider,
        model: generated.provenance.model,
        promptVersion: generated.provenance.promptVersion,
      },
    });
    await context.capabilities.DomainEventEmit({
      eventType: DomainEventType.TaskPlanGeneratedV1,
      data: { planId: plan.id },
    });
    return context.ok({
      suggestions: generated.suggestions,
      provenance: generated.provenance,
    });
  },
};
