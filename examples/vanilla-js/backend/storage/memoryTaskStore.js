export function createMemoryTaskStore(seed = []) {
  const tasks = new Map(seed.map((task) => [task.id, task]));

  return {
    async create(task) {
      tasks.set(task.id, task);
      return task;
    },
    async load(taskId) {
      return tasks.get(taskId) ?? null;
    },
    async save(task) {
      tasks.set(task.id, task);
      return task;
    },
    async delete(taskId) {
      return tasks.delete(taskId);
    },
    async list() {
      return [...tasks.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    },
  };
}

