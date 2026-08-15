import { access, readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ClientSession, Db } from "mongodb";
import type { Actor, RequestMetadata } from "../../shared/aifa.js";
import type { CapabilityName } from "../../shared/architecture-enums.js";

export interface InfrastructureContext {
  database: Db;
  actor: Actor;
  metadata: RequestMetadata;
  session?: ClientSession;
  settings: Readonly<Record<string, string>>;
}

export interface ContextInfrastructureManifest {
  name: string;
  externalCapabilities?: readonly CapabilityName[];
  ensureIndexes(database: Db): Promise<void>;
  createCapabilities(context: InfrastructureContext): Record<string, unknown>;
  health?(): Record<string, unknown>;
}

export async function discoverContextInfrastructure(
  contextsRoot: string,
): Promise<ContextInfrastructureManifest[]> {
  const contexts = await readdir(contextsRoot, { withFileTypes: true });
  const manifests: ContextInfrastructureManifest[] = [];
  for (const context of contexts.filter((entry) => entry.isDirectory())) {
    const sourceFile = join(contextsRoot, context.name, "infrastructure", "manifest.ts");
    const builtFile = join(contextsRoot, context.name, "infrastructure", "manifest.js");
    const file = await access(builtFile).then(() => builtFile).catch(() => sourceFile);
    try {
      const loaded = (await import(pathToFileURL(file).href)) as {
        infrastructureManifest?: ContextInfrastructureManifest;
      };
      if (loaded.infrastructureManifest) manifests.push(loaded.infrastructureManifest);
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== "ERR_MODULE_NOT_FOUND") throw cause;
    }
  }
  return manifests.sort((left, right) => left.name.localeCompare(right.name));
}
