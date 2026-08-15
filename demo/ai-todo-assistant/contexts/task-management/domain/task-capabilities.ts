import type { Task } from "./task.js";
import type { TaskCategory, TaskStatus } from "./task.js";
import type { PlatformCapabilities } from "../../../core/shared/aifa.js";

export interface TaskPersistenceCapabilities {
  TaskCreate(input: { task: Omit<Task, "tenantId"> }): Promise<Task>;
  TaskList(input: {
    category?: TaskCategory;
    status?: TaskStatus;
    cursor?: { createdAt: string; id: string };
    limit: number;
  }): Promise<{ tasks: Task[]; nextCursor?: string }>;
  TaskLoad(input: { taskId: string }): Promise<Task | null>;
  TaskSave(input: {
    taskId: string;
    expectedVersion: number;
    changes: Pick<Task, "status" | "version" | "updatedAt" | "completedAt">;
  }): Promise<Task | null>;
  TaskDelete(input: { taskId: string; expectedVersion: number }): Promise<boolean>;
}

export type TaskCapabilities = TaskPersistenceCapabilities & PlatformCapabilities;
