import { access, readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import type { ErrorObject, ValidateFunction } from "ajv";
import type {
  ContractValidationError,
  FeatureManifest,
} from "../../shared/feature-manifest.js";
const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020").default as typeof import("ajv/dist/2020.js").Ajv2020;
const addFormats = require("ajv-formats").default as (ajv: InstanceType<typeof Ajv2020>) => void;

interface FeatureDefinition {
  name: string;
  businessNeed: string;
  backend: {
    route: string;
    method: string;
    capabilities: string[];
    mcp: { exposed: boolean; toolName?: string };
  };
  frontend: {
    slots: string[];
    eventConsumers?: { name: string; eventType: string; contract: string }[];
  };
  contracts: { input: string; output: string; mcpInput?: string };
  events: string[];
  security: { mcpScopes: string[]; requiresConfirmation: boolean };
}

function isFeatureManifest(value: unknown): value is FeatureManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Partial<FeatureManifest>;
  return (
    typeof manifest.name === "string" &&
    typeof manifest.backend?.route === "string" &&
    typeof manifest.backend?.method === "string" &&
    Array.isArray(manifest.backend?.requiredScopes) &&
    typeof manifest.backend?.feature?.execute === "function" &&
    Array.isArray(manifest.frontend?.contributions)
  );
}

async function findFiles(directory: string, name: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) return findFiles(file, name);
      return entry.name === name || (name === "*.schema.json" && entry.name.endsWith(".schema.json"))
        ? [file]
        : [];
    }),
  );
  return nested.flat();
}

function validationErrors(errors: ErrorObject[] | null | undefined): ContractValidationError[] {
  return (errors ?? []).map((error) => ({
    path: error.instancePath || "/",
    message: error.message ?? "is invalid",
  }));
}

function validator(validate: ValidateFunction) {
  return (value: unknown): ContractValidationError[] =>
    validate(value) ? [] : validationErrors(validate.errors);
}

function assertParity(definition: FeatureDefinition, manifest: FeatureManifest, file: string): void {
  const failures: string[] = [];
  if (definition.name !== manifest.name) failures.push("name");
  if (definition.backend.route !== manifest.backend.route) failures.push("route");
  if (definition.backend.method !== manifest.backend.method) failures.push("method");
  if (
    [...definition.backend.capabilities].sort().join() !==
    [...manifest.backend.feature.capabilities].sort().join()
  )
    failures.push("capabilities");
  if (
    [...definition.security.mcpScopes].sort().join() !==
    [...manifest.backend.requiredScopes].sort().join()
  )
    failures.push("scopes");
  const slots = new Set(manifest.frontend.contributions.map(({ slot }) => slot));
  if (
    definition.frontend.slots.some((slot) => ![...slots].includes(slot as never)) ||
    [...slots].some((slot) => !definition.frontend.slots.includes(slot))
  )
    failures.push("frontend slots");
  const declaredConsumers = (definition.frontend.eventConsumers ?? [])
    .map(({ name, eventType, contract }) => `${name}:${eventType}:${contract}`)
    .sort();
  const executableConsumers = (manifest.frontend.eventConsumers ?? [])
    .map(({ name, eventType, contract }) => `${name}:${eventType}:${contract}`)
    .sort();
  if (declaredConsumers.join() !== executableConsumers.join())
    failures.push("frontend event consumers");
  if (definition.backend.mcp.exposed !== Boolean(manifest.mcp)) failures.push("MCP exposure");
  if (definition.backend.mcp.toolName !== manifest.mcp?.toolName) failures.push("MCP tool name");
  if (failures.length)
    throw new Error(`Feature definition/manifest mismatch (${failures.join(", ")}): ${file}`);
}

export async function discoverFeatureManifests(root: string): Promise<FeatureManifest[]> {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  for (const file of await findFiles(root, "*.schema.json")) {
    const schema = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
    if (typeof schema.$id === "string" && !ajv.getSchema(schema.$id)) ajv.addSchema(schema);
  }

  const manifests: FeatureManifest[] = [];
  for (const definitionFile of (await findFiles(root, "feature.definition.json")).sort()) {
    const definition = JSON.parse(await readFile(definitionFile, "utf8")) as FeatureDefinition;
    const featureDirectory = dirname(definitionFile);
    const sourceManifest = join(featureDirectory, "manifest.ts");
    const builtManifest = join(featureDirectory, "manifest.js");
    const manifestFile = await access(builtManifest).then(() => builtManifest).catch(() => sourceManifest);
    const loaded = (await import(pathToFileURL(manifestFile).href)) as { manifest?: unknown };
    if (!isFeatureManifest(loaded.manifest)) throw new Error(`Invalid feature manifest: ${manifestFile}`);
    assertParity(definition, loaded.manifest, definitionFile);

    const inputSchema = JSON.parse(
      await readFile(join(featureDirectory, definition.contracts.input), "utf8"),
    ) as Record<string, unknown>;
    const outputSchema = JSON.parse(
      await readFile(join(featureDirectory, definition.contracts.output), "utf8"),
    ) as Record<string, unknown>;
    const eventValidators = new Map<string, ValidateFunction>();
    for (const eventFile of definition.events) {
      const eventSchema = JSON.parse(await readFile(join(root, eventFile), "utf8")) as Record<
        string,
        unknown
      >;
      const eventType = (eventSchema.properties as Record<string, { const?: string }> | undefined)
        ?.eventType?.const;
      if (eventType) eventValidators.set(eventType, ajv.compile(eventSchema));
    }
    manifests.push({
      ...loaded.manifest,
      backend: {
        ...loaded.manifest.backend,
        contract: {
          inputSchema,
          outputSchema,
          validateInput: validator(ajv.compile(inputSchema)),
          validateOutput: validator(ajv.compile(outputSchema)),
          validateEvent(value) {
            const eventType =
              value && typeof value === "object"
                ? (value as Record<string, unknown>).eventType
                : undefined;
            const validate = typeof eventType === "string" ? eventValidators.get(eventType) : undefined;
            return validate
              ? validator(validate)(value)
              : [{ path: "/eventType", message: "is not declared by this feature" }];
          },
        },
      },
      ...(loaded.manifest.mcp
        ? {
            mcp: {
              ...loaded.manifest.mcp,
              description: definition.businessNeed,
              requiresConfirmation: definition.security.requiresConfirmation,
            },
          }
        : {}),
    });
  }

  const duplicate = (values: string[]) => values.find((value, index) => values.indexOf(value) !== index);
  const duplicateName = duplicate(manifests.map(({ name }) => name));
  const duplicateRoute = duplicate(manifests.map(({ backend }) => `${backend.method} ${backend.route}`));
  const duplicateTool = duplicate(manifests.flatMap(({ mcp }) => (mcp ? [mcp.toolName] : [])));
  if (duplicateName || duplicateRoute || duplicateTool)
    throw new Error(`Duplicate feature registration: ${duplicateName ?? duplicateRoute ?? duplicateTool}`);
  return manifests.sort((left, right) => left.name.localeCompare(right.name));
}
