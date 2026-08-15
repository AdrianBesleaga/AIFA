import { api } from "../../../../../core/frontend/api.js";
import { useMutation, useQueryClient } from "../../../../../core/frontend/query/react-query.js";
import type {
  TaskPlanSuggestionV1,
  TaskViewV1,
} from "../../../../../core/shared/generated/contracts.js";
import { TaskCacheTag } from "../../../../task-management/contracts/v1/task-cache.js";
import type {
  TaskCategory,
  TaskPriority,
} from "../../../../task-management/contracts/v1/task-taxonomy.js";

interface GenerateTaskPlanInput {
  goal: string;
  category: TaskCategory;
  priority: TaskPriority;
}

export function useGenerateTaskPlan() {
  return useMutation<GenerateTaskPlanInput, TaskPlanSuggestionV1[]>({
    mutationFn: async (input) =>
      (
        await api<{ suggestions: TaskPlanSuggestionV1[] }>("/api/assistant/task-plan", {
          method: "POST",
          headers: { "idempotency-key": crypto.randomUUID() },
          body: JSON.stringify(input),
        })
      ).suggestions,
  });
}

export function useAcceptTaskSuggestion() {
  const queryClient = useQueryClient();
  return useMutation<TaskPlanSuggestionV1, TaskViewV1>({
    mutationFn: async ({ title, category, priority }) =>
      (
        await api<{ task: TaskViewV1 }>("/api/tasks", {
          method: "POST",
          headers: { "idempotency-key": crypto.randomUUID() },
          body: JSON.stringify({ title, category, priority }),
        })
      ).task,
    onSuccess: () => queryClient.invalidateTags([TaskCacheTag.Collection]),
  });
}
