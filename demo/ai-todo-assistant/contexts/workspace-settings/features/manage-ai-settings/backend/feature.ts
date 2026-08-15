import { FeatureName } from "../../../../../core/shared/generated/feature-names.js";
import type { AifaFeature } from "../../../../../core/shared/aifa.js";

/**
 * Provider configuration is runtime-managed. This read boundary deliberately does
 * not expose endpoints or credentials to the browser.
 */
export const feature: AifaFeature<
  Record<string, never>,
  { configured: boolean },
  Record<string, never>
> = {
  name: FeatureName.ManageAiSettings,
  capabilities: [],
  async execute(context) {
    return context.ok({ configured: true });
  },
};
