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
    method: HttpMethod.Delete,
    route: "/api/tasks/:taskId",
    feature,
    requiredScopes: [PermissionScope.TaskDelete],
  },
  frontend: {
    contributions: [{ slot: SlotName.TaskRowActions, name: "delete-task" }],
    eventConsumers: [
      {
        name: "invalidate-task-collection-after-delete",
        eventType: DomainEventType.TaskDeletedV1,
        contract: "task-management/contracts/events/v1/task-deleted.schema.json",
      },
    ],
  },
  mcp: { toolName: "delete_task" },
} satisfies FeatureManifest;
