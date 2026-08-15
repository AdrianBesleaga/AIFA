import { api } from "../../../../../core/frontend/api.js";
import { useMutation, useQueryClient } from "../../../../../core/frontend/query/react-query.js";
import type { TaskViewV1 } from "../../../../../core/shared/generated/contracts.js";
import { TaskCacheTag } from "../../../contracts/v1/task-cache.js";
import type { TaskStatus } from "../../../contracts/v1/task-taxonomy.js";

interface ChangeTaskStatusInput {
  task: TaskViewV1;
  status: TaskStatus;
}

export function useChangeTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation<ChangeTaskStatusInput, TaskViewV1>({
    mutationFn: async ({ task, status }) =>
      (
        await api<{ task: TaskViewV1 }>(`/api/tasks/${task.id}/status`, {
          method: "PATCH",
          headers: { "idempotency-key": crypto.randomUUID() },
          body: JSON.stringify({ status, expectedVersion: task.version }),
        })
      ).task,
    onSuccess: () => queryClient.invalidateTags([TaskCacheTag.Collection]),
  });
}
