import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

import { CapabilityName, FeatureName, HttpMethod, PermissionScope, SlotName } from "../shared/architecture-enums.js";

interface FeatureDefinition {
  name: string;
  dependsOn: string[];
  consumesContracts: string[];
  events: string[];
  backend: { route: string; method: string; capabilities: string[]; mcp: { exposed: boolean; toolName?: string } };
  frontend: { slots: string[] };
  contracts: { input: string; output: string; mcpInput?: string };
  security: { mutation: boolean; actorRequired: boolean; idempotent: boolean; requiresConfirmation: boolean; mcpScopes: string[]; concurrency: "none" | "optimistic" };
}

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const contextsRoot = join(appRoot, "contexts");
const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020").default;
const addFormats = require("ajv-formats").default;

async function findFiles(directory: string, predicate: (file: string) => boolean): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const location = join(directory, entry.name);
    if (entry.isDirectory()) return findFiles(location, predicate);
    return predicate(location) ? [location] : [];
  }));
  return files.flat();
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

function assertEnumValue(value: string, values: object, label: string): void {
  if (!Object.values(values).includes(value)) throw new Error(`${label} has unknown enum value '${value}'`);
}

function assertExistingFile(base: string, reference: string, label: string): string {
  const file = resolve(base, reference);
  if (!existsSync(file)) throw new Error(`${label} references missing file '${reference}'`);
  return file;
}

function assertAcyclicFeatureDependencies(features: FeatureDefinition[]): void {
  const byName = new Map(features.map((feature) => [feature.name, feature]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (name: string, path: string[]): void => {
    if (visiting.has(name)) throw new Error(`Circular feature dependency: ${[...path, name].join(" -> ")}`);
    if (visited.has(name)) return;
    const feature = byName.get(name);
    if (!feature) throw new Error(`Feature '${path.at(-1)}' depends on unknown feature '${name}'`);
    visiting.add(name);
    for (const dependency of feature.dependsOn) visit(dependency, [...path, name]);
    visiting.delete(name);
    visited.add(name);
  };
  for (const feature of features) visit(feature.name, []);
}

async function main(): Promise<void> {
  const definitionSchema = await readJson<object>(join(appRoot, "core/architecture/feature-definition.schema.json"));
  const schemaFiles = await findFiles(contextsRoot, (file) => file.endsWith(".schema.json"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  for (const schemaFile of schemaFiles) ajv.addSchema(await readJson<object>(schemaFile), pathToFileURL(schemaFile).href);
  const validateDefinition = ajv.compile(definitionSchema);
  for (const schemaFile of schemaFiles) ajv.getSchema(pathToFileURL(schemaFile).href) ?? ajv.compile(await readJson<object>(schemaFile));

  const definitionFiles = await findFiles(contextsRoot, (file) => file.endsWith("feature.definition.json"));
  const definitions = await Promise.all(definitionFiles.map(async (file) => ({ file, definition: await readJson<FeatureDefinition>(file) })));
  const routes = new Set<string>();
  const tools = new Set<string>();

  for (const { file, definition } of definitions) {
    if (!validateDefinition(definition)) throw new Error(`${relative(appRoot, file)} fails schema validation: ${ajv.errorsText(validateDefinition.errors)}`);
    assertEnumValue(definition.name, FeatureName, definition.name);
    assertEnumValue(definition.backend.method, HttpMethod, definition.name);
    for (const capability of definition.backend.capabilities) assertEnumValue(capability, CapabilityName, definition.name);
    for (const slot of definition.frontend.slots) assertEnumValue(slot, SlotName, definition.name);
    for (const scope of definition.security.mcpScopes) assertEnumValue(scope, PermissionScope, definition.name);
    if (!definition.security.actorRequired || !definition.security.idempotent) throw new Error(`${definition.name} must require an actor and be idempotent`);
    if (definition.backend.mcp.exposed && definition.security.mcpScopes.length === 0) throw new Error(`${definition.name} exposes MCP without a scope`);
    if (definition.backend.method === HttpMethod.Delete && !definition.security.requiresConfirmation) throw new Error(`${definition.name} deletion requires confirmation`);
    const routeKey = `${definition.backend.method} ${definition.backend.route}`;
    if (routes.has(routeKey)) throw new Error(`Duplicate route ${routeKey}`);
    routes.add(routeKey);
    if (definition.backend.mcp.exposed) {
      if (!definition.backend.mcp.toolName) throw new Error(`${definition.name} exposes MCP without a tool name`);
      if (tools.has(definition.backend.mcp.toolName)) throw new Error(`Duplicate MCP tool ${definition.backend.mcp.toolName}`);
      tools.add(definition.backend.mcp.toolName);
    }

    const featureDirectory = dirname(file);
    const inputSchema = await readJson<{ required?: string[] }>(assertExistingFile(featureDirectory, definition.contracts.input, definition.name));
    assertExistingFile(featureDirectory, definition.contracts.output, definition.name);
    if (definition.contracts.mcpInput) assertExistingFile(featureDirectory, definition.contracts.mcpInput, definition.name);
    if (definition.security.mutation && !inputSchema.required?.includes("idempotencyKey")) throw new Error(`${definition.name} mutation input requires idempotencyKey`);
    if (definition.security.concurrency === "optimistic" && !inputSchema.required?.includes("expectedVersion")) throw new Error(`${definition.name} optimistic mutation input requires expectedVersion`);
    for (const contract of [...definition.consumesContracts, ...definition.events]) assertExistingFile(contextsRoot, contract, definition.name);
  }
  assertAcyclicFeatureDependencies(definitions.map(({ definition }) => definition));
  console.log(`Validated ${definitions.length} feature definitions, schemas, contracts, routes, MCP tools, enums, and dependency graph.`);
}

void main();
