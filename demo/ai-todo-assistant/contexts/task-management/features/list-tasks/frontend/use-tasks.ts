import { useMemo } from "react";
import { api } from "../../../../../core/frontend/api.js";
import { useQuery } from "../../../../../core/frontend/query/react-query.js";
import type {
  TaskManagementTaxonomyV1,
  TaskViewV1,
} from "../../../../../core/shared/generated/contracts.js";
import { TaskCacheTag, TaskQueryName } from "../../../contracts/v1/task-cache.js";

type TaskCategory = TaskManagementTaxonomyV1["category"];
type TaskStatus = TaskManagementTaxonomyV1["status"];

export interface TaskFilters {
  category: TaskCategory | "";
  status: TaskStatus | "";
}

export function useTasks(filters: TaskFilters) {
  const key = useMemo(
    () => [TaskQueryName.List, filters.category, filters.status] as const,
    [filters.category, filters.status],
  );
  return useQuery<TaskViewV1[]>({
    key,
    tags: [TaskCacheTag.Collection],
    queryFn: async ({ signal }) => {
      const query = new URLSearchParams({
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      });
      return (
        await api<{ tasks: TaskViewV1[] }>(`/api/tasks${query.size ? `?${query}` : ""}`, {
          signal,
        })
      ).tasks;
    },
  });
}
