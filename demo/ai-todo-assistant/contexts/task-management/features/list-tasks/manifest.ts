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
    method: HttpMethod.Get,
    route: "/api/tasks",
    feature,
    requiredScopes: [PermissionScope.TaskRead],
  },
  frontend: {
    contributions: [
      { slot: SlotName.TaskList, name: "task-list" },
      { slot: SlotName.AppHeader, name: "workspace-header" },
      { slot: SlotName.AppNavigation, name: "task-workspace-navigation" },
      { slot: SlotName.AppContent, name: "task-workspace-content" },
      { slot: SlotName.AppFooter, name: "task-workspace-footer" },
    ],
  },
  mcp: { toolName: "list_tasks" },
} satisfies FeatureManifest;
