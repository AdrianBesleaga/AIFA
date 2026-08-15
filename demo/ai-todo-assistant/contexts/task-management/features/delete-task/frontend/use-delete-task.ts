import { api } from "../../../../../core/frontend/api.js";
import { useMutation, useQueryClient } from "../../../../../core/frontend/query/react-query.js";
import type { TaskViewV1 } from "../../../../../core/shared/generated/contracts.js";
import { TaskCacheTag } from "../../../contracts/v1/task-cache.js";

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation<TaskViewV1, true>({
    mutationFn: async (task) =>
      (
        await api<{ deleted: true }>(`/api/tasks/${task.id}`, {
          method: "DELETE",
          headers: { "idempotency-key": crypto.randomUUID() },
          body: JSON.stringify({ expectedVersion: task.version, confirmed: true }),
        })
      ).deleted,
    onSuccess: () => queryClient.invalidateTags([TaskCacheTag.Collection]),
  });
}
