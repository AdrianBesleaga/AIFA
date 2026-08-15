import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Task, TaskStore } from "../types";

export function createFileTaskStore(filePath: string): TaskStore {
  async function readTasks(): Promise<Task[]> {
    try { return JSON.parse(await readFile(filePath, "utf8")) as Task[]; }
    catch (error: unknown) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
      throw error;
    }
  }
  async function writeTasks(tasks: Task[]): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(tasks, null, 2));
  }
  return {
    async create(task) { const tasks = await readTasks(); await writeTasks([...tasks, task]); return task; },
    async load(taskId) { return (await readTasks()).find((task) => task.id === taskId) ?? null; },
    async save(task) { const tasks = await readTasks(); await writeTasks(tasks.map((stored) => stored.id === task.id ? task : stored)); return task; },
    async delete(taskId) { const tasks = await readTasks(); const next = tasks.filter((task) => task.id !== taskId); await writeTasks(next); return next.length !== tasks.length; },
    async list() { return (await readTasks()).sort((left, right) => left.createdAt.localeCompare(right.createdAt)); },
  };
}
