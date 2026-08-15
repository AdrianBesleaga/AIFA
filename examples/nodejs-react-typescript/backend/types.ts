export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface Actor {
  id: string;
}

export interface AuditEntry {
  type: string;
  actorId: string;
  taskId: string;
  recordedAt?: string;
}

export interface TaskStore {
  create(task: Task): Promise<Task>;
  load(taskId: string): Promise<Task | null>;
  save(task: Task): Promise<Task>;
  delete(taskId: string): Promise<boolean>;
  list(): Promise<Task[]>;
}

export interface RuntimeCapabilities {
  "id.create": () => Promise<string>;
  "clock.now": () => Promise<string>;
  "task.create": (input: { task: Task }) => Promise<Task>;
  "task.load": (input: { taskId: string }) => Promise<Task | null>;
  "task.save": (input: { task: Task }) => Promise<Task>;
  "task.delete": (input: { taskId: string }) => Promise<boolean>;
  "task.list": () => Promise<Task[]>;
  "audit.record": (entry: AuditEntry) => Promise<void>;
}
