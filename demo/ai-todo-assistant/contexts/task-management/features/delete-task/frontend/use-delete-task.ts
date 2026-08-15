import { commandApi } from "../../../../../core/frontend/api.js";
import { useCommandMutation, useQueryClient } from "../../../../../core/frontend/query/react-query.js";
import type { TaskViewV1 } from "../../../../../core/shared/generated/contracts.js";
import { HttpMethod } from "../../../../../core/shared/architecture-enums.js";
import { TaskCacheTag } from "../../../contracts/v1/task-cache.js";

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useCommandMutation<TaskViewV1, true>({
    commandFn: async (task, commandId) =>
      (
        await commandApi<{ deleted: true }>(
          `/api/tasks/${task.id}`,
          commandId,
          { expectedVersion: task.version, confirmed: true },
          HttpMethod.Delete,
        )
      ).deleted,
    onSuccess: () => queryClient.invalidateTags([TaskCacheTag.Collection]),
  });
}
