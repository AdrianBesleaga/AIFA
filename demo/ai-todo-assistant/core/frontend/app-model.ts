import type { AppSurface } from "../shared/architecture-enums.js";
import type {
  TaskManagementTaxonomyV1,
  TaskPlanSuggestionV1,
  TaskViewV1,
} from "../shared/generated/contracts.js";

export type TaskCategory = TaskManagementTaxonomyV1["category"];
export type TaskPriority = TaskManagementTaxonomyV1["priority"];
export type TaskStatus = TaskManagementTaxonomyV1["status"];
export type TaskView = TaskViewV1;

export interface ShellModel {
  activeSurface: AppSurface;
  signedIn: boolean;
  signIn(): Promise<void>;
  setActiveSurface(value: AppSurface): void;
}

export type EmptySlotModel = Readonly<Record<string, never>>;

export interface TaskRowActionsModel {
  task: TaskView;
}

export interface TaskSuggestionActionsModel {
  suggestion: TaskPlanSuggestionV1;
}

export interface TaskListModel {
  tasks: readonly TaskView[];
  error: string;
  categoryFilter: TaskCategory | "";
  statusFilter: TaskStatus | "";
  setCategoryFilter(value: TaskCategory | ""): void;
  setStatusFilter(value: TaskStatus | ""): void;
}
