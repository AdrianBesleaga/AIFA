import { commandApi } from "../../../../../core/frontend/api.js";
import { useCommandMutation, useQueryClient } from "../../../../../core/frontend/query/react-query.js";
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
  return useCommandMutation<CreateTaskInput, TaskViewV1>({
    commandFn: async (input, commandId) =>
      (
        await commandApi<{ task: TaskViewV1 }>("/api/tasks", commandId, input)
      ).task,
    onSuccess: () => queryClient.invalidateTags([TaskCacheTag.Collection]),
  });
}
