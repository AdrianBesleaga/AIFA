import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export function createFileTaskStore(filePath) {
  async function readTasks() {
    try {
      const raw = await readFile(filePath, "utf8");
      return JSON.parse(raw);
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }

      throw error;
    }
  }

  async function writeTasks(tasks) {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(tasks, null, 2));
  }

  return {
    async create(task) {
      const tasks = await readTasks();
      await writeTasks([...tasks, task]);
      return task;
    },
    async load(taskId) {
      const tasks = await readTasks();
      return tasks.find((task) => task.id === taskId) ?? null;
    },
    async save(task) {
      const tasks = await readTasks();
      await writeTasks(tasks.map((storedTask) => (storedTask.id === task.id ? task : storedTask)));
      return task;
    },
    async delete(taskId) {
      const tasks = await readTasks();
      const nextTasks = tasks.filter((task) => task.id !== taskId);
      await writeTasks(nextTasks);
      return nextTasks.length !== tasks.length;
    },
    async list() {
      const tasks = await readTasks();
      return tasks.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    },
  };
}
