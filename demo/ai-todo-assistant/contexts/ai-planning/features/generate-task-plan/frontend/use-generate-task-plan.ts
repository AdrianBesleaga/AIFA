import { commandApi } from "../../../../../core/frontend/api.js";
import { useCommandMutation } from "../../../../../core/frontend/query/react-query.js";
import type { TaskPlanSuggestionV1 } from "../../../../../core/shared/generated/contracts.js";
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
  return useCommandMutation<GenerateTaskPlanInput, TaskPlanSuggestionV1[]>({
    commandFn: async (input, commandId) =>
      (
        await commandApi<{ suggestions: TaskPlanSuggestionV1[] }>(
          "/api/assistant/task-plan",
          commandId,
          input,
        )
      ).suggestions,
  });
}
