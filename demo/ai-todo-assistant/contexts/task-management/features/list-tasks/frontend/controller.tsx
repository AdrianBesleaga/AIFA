import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type TaskCategory,
  type TaskListModel,
  type TaskStatus,
} from "../../../../../core/frontend/app-model.js";
import { useTasks } from "./use-tasks.js";

const TaskWorkspaceContext = createContext<TaskListModel | null>(null);

export function TaskWorkspaceProvider({ children }: { children: ReactNode }) {
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "">("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const query = useTasks({ category: categoryFilter, status: statusFilter });
  const model = useMemo<TaskListModel>(
    () => ({
      tasks: query.data ?? [],
      error: query.error?.message ?? "",
      categoryFilter,
      statusFilter,
      setCategoryFilter,
      setStatusFilter,
    }),
    [categoryFilter, query.data, query.error, statusFilter],
  );
  return <TaskWorkspaceContext.Provider value={model}>{children}</TaskWorkspaceContext.Provider>;
}

export function useTaskWorkspace(): TaskListModel {
  const model = useContext(TaskWorkspaceContext);
  if (!model) throw new Error("TaskWorkspaceProvider is not registered");
  return model;
}
