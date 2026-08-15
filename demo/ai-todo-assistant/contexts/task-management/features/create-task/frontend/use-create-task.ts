import { api } from "../../../../../core/frontend/api.js";
import { useMutation, useQueryClient } from "../../../../../core/frontend/query/react-query.js";
import type { TaskViewV1 } from "../../../../../core/shared/generated/contracts.js";
import { TaskCacheTag } from "../../../contracts/v1/task-cache.js";
import type { TaskCategory, TaskPriority } from "../../../contracts/v1/task-taxonomy.js";

export interface CreateTaskInput {
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation<CreateTaskInput, TaskViewV1>({
    mutationFn: async (input) =>
      (
        await api<{ task: TaskViewV1 }>("/api/tasks", {
          method: "POST",
          headers: { "idempotency-key": crypto.randomUUID() },
          body: JSON.stringify(input),
        })
      ).task,
    onSuccess: () => queryClient.invalidateTags([TaskCacheTag.Collection]),
  });
}
