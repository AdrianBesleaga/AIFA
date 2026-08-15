import {
  TaskCategory,
  TaskPriority,
} from "../../task-management/contracts/v1/task-taxonomy.js";
import type { TaskPlan } from "./task-plan.js";
import type { PlatformCapabilities } from "../../../core/shared/aifa.js";

export interface TaskPlanSuggestion {
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  rationale: string;
}
export interface GenerateTaskPlanRequest {
  goal: string;
  category: TaskCategory;
  priority: TaskPriority;
}
export type TaskPlanProviderResult =
  | {
      ok: true;
      suggestions: TaskPlanSuggestion[];
      provenance: { provider: string; model: string; promptVersion: string; latencyMs: number };
    }
  | {
      ok: false;
      code: "ProviderUnavailable" | "AssistantResponseInvalid";
      message: string;
    };
export interface AiPlanningPersistenceCapabilities {
  AssistantGenerateTaskPlan(input: GenerateTaskPlanRequest): Promise<TaskPlanProviderResult>;
  TaskPlanCreate(input: { plan: Omit<TaskPlan, "tenantId"> }): Promise<TaskPlan>;
}
export type AiPlanningCapabilities = AiPlanningPersistenceCapabilities & PlatformCapabilities;
