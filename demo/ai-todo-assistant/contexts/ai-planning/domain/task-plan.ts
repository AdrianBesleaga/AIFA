import type { TaskPlanSuggestion } from "./task-planning.js";
export enum TaskPlanStatus {
  Generated = "Generated",
  Accepted = "Accepted",
  Archived = "Archived",
}
export interface TaskPlan {
  id: string;
  tenantId: string;
  goal: string;
  suggestions: TaskPlanSuggestion[];
  status: TaskPlanStatus;
  createdAt: string;
  provider: string;
  model: string;
  promptVersion: string;
}
