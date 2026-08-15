import { CapabilityName } from "../../../../../core/shared/architecture-enums.js";
import { FeatureName } from "../../../../../core/shared/generated/feature-names.js";
import type { AifaFeature } from "../../../../../core/shared/aifa.js";
import type { TaskCategory, TaskStatus } from "../../../domain/task.js";
import type { TaskCapabilities } from "../../../domain/task-capabilities.js";
import { toTaskView, type TaskView } from "../../../contracts/v1/task-view.js";
import { ErrorCode } from "../../../../../core/shared/architecture-enums.js";
interface ListTasksInput {
  category?: TaskCategory;
  status?: TaskStatus;
  cursor?: string;
  limit?: number;
}
function decodeCursor(value: string | undefined): { createdAt: string; id: string } | undefined {
  if (!value) return undefined;
  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof cursor.createdAt === "string" && typeof cursor.id === "string")
      return { createdAt: cursor.createdAt, id: cursor.id };
  } catch {}
  return undefined;
}
export const feature: AifaFeature<
  ListTasksInput,
  { tasks: TaskView[]; nextCursor?: string },
  Pick<TaskCapabilities, "TaskList">
> = {
  name: FeatureName.ListTasks,
  capabilities: [CapabilityName.TaskList],
  async execute(context) {
    const cursor = decodeCursor(context.input.cursor);
    if (context.input.cursor && !cursor)
      return context.fail(ErrorCode.InvalidInput, "Cursor is invalid");
    const page = await context.capabilities.TaskList({
      category: context.input.category,
      status: context.input.status,
      cursor,
      limit: context.input.limit ?? 50,
    });
    return context.ok({
      tasks: page.tasks.map(toTaskView),
      ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
    });
  },
};
