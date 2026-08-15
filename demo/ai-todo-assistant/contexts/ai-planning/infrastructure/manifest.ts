import type { ContextInfrastructureManifest } from "../../../core/backend/discovery/context-infrastructure.js";
import { CapabilityName } from "../../../core/shared/architecture-enums.js";
import { createMongoTaskPlanCapabilities, ensureTaskPlanIndexes } from "./mongo-task-plan-capabilities.js";
import { createOllamaTaskPlanner } from "./ollama-task-planner.js";
const planners = new Map<string, ReturnType<typeof createOllamaTaskPlanner>>();

export const infrastructureManifest = {
  name: "ai-planning",
  externalCapabilities: [CapabilityName.AssistantGenerateTaskPlan],
  health() {
    return { providers: [...planners.values()].map((planner) => planner.health()) };
  },
  ensureIndexes: ensureTaskPlanIndexes,
  createCapabilities({ database, actor, session, settings }) {
    const baseUrl = settings.ollamaBaseUrl ?? "http://127.0.0.1:11434";
    const model = settings.ollamaModel ?? "llama3.2";
    const key = `${baseUrl}\n${model}`;
    let planner = planners.get(key);
    if (!planner) {
      planner = createOllamaTaskPlanner(baseUrl, model);
      planners.set(key, planner);
    }
    return {
      ...createMongoTaskPlanCapabilities(database, actor, session),
      AssistantGenerateTaskPlan: planner,
    };
  },
} satisfies ContextInfrastructureManifest;
