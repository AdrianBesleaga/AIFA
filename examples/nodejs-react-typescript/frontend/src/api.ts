import type { ApiResult, ApiSuccess, Task } from "./types";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3000";

export function listTasks(): Promise<ApiSuccess<{ tasks: Task[] }>> {
  return request("/api/tasks");
}

export function createTask(
  task: Pick<Task, "title" | "priority">,
): Promise<ApiSuccess<{ task: Task }>> {
  return request("/api/tasks", {
    method: "POST",
    body: JSON.stringify(task),
  });
}

export function setTaskCompleted(
  taskId: string,
  completed: boolean,
): Promise<ApiSuccess<{ task: Task }>> {
  return request(`/api/tasks/${taskId}/${completed ? "complete" : "reopen"}`, {
    method: "POST",
  });
}

export function deleteTask(taskId: string): Promise<ApiSuccess<{ deleted: true }>> {
  return request(`/api/tasks/${taskId}`, {
    method: "DELETE",
  });
}

async function request<Value>(path: string, options: RequestInit = {}): Promise<ApiSuccess<Value>> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
    ...options,
  });
  const result = (await response.json()) as ApiResult<Value>;

  if (!response.ok || !result.ok) {
    throw new Error(result.ok ? "Request failed" : result.error.message);
  }

  return result;
}
