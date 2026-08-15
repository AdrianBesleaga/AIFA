export { TaskCategory, TaskPriority, TaskStatus } from "../contracts/v1/task-taxonomy.js";
import {
  TaskStatus,
  type TaskCategory,
  type TaskPriority,
} from "../contracts/v1/task-taxonomy.js";

export interface Task {
  id: string;
  tenantId: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface NewTaskDraft {
  id: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  now: string;
}

export function normalizeTaskTitle(value: string): string | undefined {
  return value.trim() || undefined;
}

export function createTaskDraft(input: NewTaskDraft): Omit<Task, "tenantId"> {
  return {
    id: input.id,
    title: input.title,
    category: input.category,
    priority: input.priority,
    status: TaskStatus.Todo,
    version: 1,
    createdAt: input.now,
    updatedAt: input.now,
    completedAt: null,
  };
}

export type TaskTransitionResult =
  | { ok: true; task: Task }
  | { ok: false; from: TaskStatus; to: TaskStatus };

const allowedTransitions: Readonly<Record<TaskStatus, readonly TaskStatus[]>> = {
  [TaskStatus.Todo]: [TaskStatus.InProgress, TaskStatus.Completed],
  [TaskStatus.InProgress]: [TaskStatus.Todo, TaskStatus.Completed],
  [TaskStatus.Completed]: [TaskStatus.Todo],
};

export function transitionTaskStatus(
  task: Task,
  status: TaskStatus,
  now: string,
): TaskTransitionResult {
  if (task.status === status) return { ok: true, task };
  if (!allowedTransitions[task.status].includes(status))
    return { ok: false, from: task.status, to: status };
  return { ok: true, task: {
    ...task,
    status,
    version: task.version + 1,
    updatedAt: now,
    completedAt: status === TaskStatus.Completed ? now : null,
  } };
}
