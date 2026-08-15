import { commandApi } from "../../../../../core/frontend/api.js";
import { useCommandMutation, useQueryClient } from "../../../../../core/frontend/query/react-query.js";
import type { TaskViewV1 } from "../../../../../core/shared/generated/contracts.js";
import { HttpMethod } from "../../../../../core/shared/architecture-enums.js";
import { TaskCacheTag } from "../../../contracts/v1/task-cache.js";
import type { TaskStatus } from "../../../contracts/v1/task-taxonomy.js";

interface ChangeTaskStatusInput {
  task: TaskViewV1;
  status: TaskStatus;
}

export function useChangeTaskStatus() {
  const queryClient = useQueryClient();
  return useCommandMutation<ChangeTaskStatusInput, TaskViewV1>({
    commandFn: async ({ task, status }, commandId) =>
      (
        await commandApi<{ task: TaskViewV1 }>(
          `/api/tasks/${task.id}/status`,
          commandId,
          { status, expectedVersion: task.version },
          HttpMethod.Patch,
        )
      ).task,
    onSuccess: () => queryClient.invalidateTags([TaskCacheTag.Collection]),
  });
}
