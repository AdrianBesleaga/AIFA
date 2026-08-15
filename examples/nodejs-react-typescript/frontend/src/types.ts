export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccess<Value> {
  ok: true;
  value: Value;
}

export interface ApiFailure {
  ok: false;
  error: ApiError;
}

export type ApiResult<Value> = ApiSuccess<Value> | ApiFailure;

export interface AppSlotModel {
  tasks: Task[];
  visibleTasks: Task[];
  activeFeature: string;
  refreshTasks: (featureName?: string) => Promise<void>;
  createExampleTask: () => Promise<void>;
}

export interface TaskActionsSlotModel {
  task: Task;
  completeTask: () => Promise<void>;
  reopenTask: () => Promise<void>;
  deleteTask: () => Promise<void>;
}

export interface EmptyStateSlotModel {
  createExampleTask: () => Promise<void>;
}

export interface SlotModels {
  APP_HEADER_ACTIONS: AppSlotModel;
  TASK_SUMMARY_CARDS: AppSlotModel;
  TASK_ACTIONS: TaskActionsSlotModel;
  EMPTY_STATE_ACTIONS: EmptyStateSlotModel;
}

export type SlotName = keyof SlotModels;
