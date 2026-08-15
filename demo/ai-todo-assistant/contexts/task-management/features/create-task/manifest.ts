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
    method: HttpMethod.Post,
    route: "/api/tasks",
    feature,
    requiredScopes: [PermissionScope.TaskWrite],
  },
  frontend: {
    contributions: [{ slot: SlotName.TaskComposer, name: "create-task-form" }],
    eventConsumers: [
      {
        name: "invalidate-task-collection-after-create",
        eventType: DomainEventType.TaskCreatedV1,
        contract: "task-management/contracts/events/v1/task-created.schema.json",
      },
    ],
  },
  mcp: { toolName: "create_task" },
} satisfies FeatureManifest;
