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
    route: "/api/settings/ai",
    feature,
    requiredScopes: [PermissionScope.SettingsRead],
  },
  frontend: {
    contributions: [
      { slot: SlotName.AppNavigation, name: "ai-settings-navigation" },
      { slot: SlotName.AppContent, name: "ai-settings-page" },
      { slot: SlotName.SettingsPanel, name: "ai-settings-panel" },
    ],
  },
} satisfies FeatureManifest;
