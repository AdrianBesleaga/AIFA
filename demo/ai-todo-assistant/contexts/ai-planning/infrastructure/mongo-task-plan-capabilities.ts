import type { ClientSession, Db } from "mongodb";
import type { TaskPlan } from "../domain/task-plan.js";
import type { Actor } from "../../../core/shared/aifa.js";
export function createMongoTaskPlanCapabilities(
  database: Db,
  actor: Actor,
  session?: ClientSession,
) {
  const plans = database.collection<TaskPlan>("task_plans");
  return {
    async TaskPlanCreate({ plan }: { plan: Omit<TaskPlan, "tenantId"> }) {
      const tenantPlan = { ...plan, tenantId: actor.tenantId };
      await plans.insertOne(tenantPlan, { session });
      return tenantPlan;
    },
  };
}
export async function ensureTaskPlanIndexes(database: Db): Promise<void> {
  await database
    .collection<TaskPlan>("task_plans")
    .createIndex({ tenantId: 1, createdAt: -1 }, { name: "tenant_plan_time" });
}
