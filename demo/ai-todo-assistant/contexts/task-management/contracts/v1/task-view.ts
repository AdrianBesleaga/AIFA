import type { Task } from "../../domain/task.js";
import type { TaskViewV1 } from "../../../../core/shared/generated/contracts.js";

export type TaskView = TaskViewV1;

export function toTaskView({ tenantId: _tenantId, ...view }: Task): TaskView {
  return view;
}
