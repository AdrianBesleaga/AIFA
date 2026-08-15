import type { FeatureManifest } from "../../shared/feature-manifest.js";

export interface MatchedRoute {
  manifest: FeatureManifest;
  params: Record<string, string>;
}

export function matchRoute(
  manifests: readonly FeatureManifest[],
  method: string | undefined,
  pathname: string,
): MatchedRoute | null {
  for (const manifest of manifests) {
    if (manifest.backend.method !== method) continue;
    const names = [...manifest.backend.route.matchAll(/:([^/]+)/g)].map((match) => match[1]);
    const match = pathname.match(
      new RegExp(`^${manifest.backend.route.replace(/:[^/]+/g, "([^/]+)")}$`),
    );
    if (!match) continue;
    return {
      manifest,
      params: Object.fromEntries(
        names.map((name, index) => [name, decodeURIComponent(match[index + 1]!)]),
      ),
    };
  }
  return null;
}
