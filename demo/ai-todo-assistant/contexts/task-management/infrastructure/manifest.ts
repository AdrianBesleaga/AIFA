import type { ContextInfrastructureManifest } from "../../../core/backend/discovery/context-infrastructure.js";
import { createMongoTaskCapabilities, ensureTaskManagementIndexes } from "./mongo-task-capabilities.js";

export const infrastructureManifest = {
  name: "task-management",
  ensureIndexes: ensureTaskManagementIndexes,
  createCapabilities({ database, actor, session }) {
    return { ...createMongoTaskCapabilities(database, actor, session) };
  },
} satisfies ContextInfrastructureManifest;
