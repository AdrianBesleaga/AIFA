import {
  DomainEventType,
  HttpMethod,
  PermissionScope,
  SlotName,
} from "../../../../core/shared/architecture-enums.js";
import { feature } from "./backend/feature.js";
import type { FeatureManifest } from "../../../../core/shared/feature-manifest.js";
export const manifest = {
  name: feature.name,
  backend: {
    method: HttpMethod.Patch,
    route: "/api/tasks/:taskId/status",
    feature,
    requiredScopes: [PermissionScope.TaskWrite],
  },
  frontend: {
    contributions: [{ slot: SlotName.TaskRowActions, name: "change-task-status" }],
    eventConsumers: [
      {
        name: "invalidate-task-collection-after-status-change",
        eventType: DomainEventType.TaskStatusChangedV1,
        contract: "task-management/contracts/events/v1/task-status-changed.schema.json",
      },
    ],
  },
  mcp: { toolName: "change_task_status" },
} satisfies FeatureManifest;
