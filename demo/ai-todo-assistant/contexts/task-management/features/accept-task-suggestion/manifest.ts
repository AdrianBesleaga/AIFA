import {
  DomainEventType,
  HttpMethod,
  PermissionScope,
  SlotName,
} from "../../../../core/shared/architecture-enums.js";
import type { FeatureManifest } from "../../../../core/shared/feature-manifest.js";
import { feature } from "./backend/feature.js";

export const manifest = {
  name: feature.name,
  backend: {
    method: HttpMethod.Post,
    route: "/api/task-plan-suggestions/accept",
    feature,
    requiredScopes: [PermissionScope.TaskWrite],
  },
  frontend: {
    contributions: [
      { slot: SlotName.TaskSuggestionActions, name: "accept-task-suggestion" },
    ],
    eventConsumers: [
      {
        name: "invalidate-task-collection-after-suggestion-acceptance",
        eventType: DomainEventType.TaskCreatedV1,
        contract: "task-management/contracts/events/v1/task-created.schema.json",
      },
    ],
  },
} satisfies FeatureManifest;
