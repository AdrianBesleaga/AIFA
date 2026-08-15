import {
  HttpMethod,
  PermissionScope,
  SlotName,
} from "../../../../core/shared/architecture-enums.js";
import { feature } from "./backend/feature.js";
import type { FeatureManifest } from "../../../../core/shared/feature-manifest.js";
export const manifest = {
  name: feature.name,
  backend: {
    method: HttpMethod.Post,
    route: "/api/assistant/task-plan",
    feature,
    requiredScopes: [PermissionScope.AssistantPlanGenerate],
  },
  frontend: {
    contributions: [{ slot: SlotName.AssistantPanel, name: "task-plan-review" }],
  },
  mcp: { toolName: "generate_task_plan" },
} satisfies FeatureManifest;
