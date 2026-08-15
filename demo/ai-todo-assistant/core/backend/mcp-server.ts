import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fromJSONSchema } from "zod/v4";
import { HttpMethod } from "../shared/architecture-enums.js";
import type { FeatureManifest } from "../shared/feature-manifest.js";

export function buildMcpInputSchema(manifest: FeatureManifest): Record<string, unknown> {
  const mutation = manifest.backend.method !== HttpMethod.Get;
  const baseSchema = structuredClone(manifest.backend.contract!.inputSchema);
  return mutation
    ? {
        ...baseSchema,
        required: [...((baseSchema.required as string[] | undefined) ?? []), "commandId"],
        properties: {
          ...((baseSchema.properties as Record<string, unknown> | undefined) ?? {}),
          commandId: {
            type: "string",
            minLength: 16,
            maxLength: 128,
            description: "Stable caller-supplied command identifier; reuse it for retries.",
          },
        },
      }
    : baseSchema;
}

export function expandMcpRoute(route: string, input: Record<string, unknown>): string {
  return route.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, (_match, name: string) => {
    const value = input[name];
    if (typeof value !== "string" || !value) throw new Error(`Missing route parameter '${name}'`);
    delete input[name];
    return encodeURIComponent(value);
  });
}

export function createFeatureMcpServer(
  manifests: readonly FeatureManifest[],
  actorHeaders: Record<string, string>,
  apiBaseUrl: string,
  request: typeof fetch = fetch,
): McpServer {
  const server = new McpServer({ name: "ai-todo-assistant", version: "0.1.0" });
  for (const manifest of manifests.filter((item) => item.mcp)) {
    const mutation = manifest.backend.method !== HttpMethod.Get;
    server.registerTool(
      manifest.mcp!.toolName,
      {
        description: manifest.mcp!.description ?? `Run the ${manifest.name} feature.`,
        inputSchema: fromJSONSchema(buildMcpInputSchema(manifest)),
        annotations: {
          readOnlyHint: !mutation,
          destructiveHint: manifest.mcp!.requiresConfirmation ?? false,
          idempotentHint: true,
        },
      },
      async (rawArgs) => {
        const input = { ...(rawArgs as Record<string, unknown>) };
        const commandId = mutation ? String(input.commandId ?? "") : undefined;
        delete input.commandId;
        const route = expandMcpRoute(manifest.backend.route, input);
        const query =
          manifest.backend.method === HttpMethod.Get
            ? `?${new URLSearchParams(
                Object.entries(input).map(([key, value]) => [key, String(value)]),
              ).toString()}`
            : "";
        const response = await request(`${apiBaseUrl}${route}${query}`, {
          method: manifest.backend.method,
          headers: {
            "content-type": "application/json",
            ...(commandId ? { "idempotency-key": commandId } : {}),
            ...actorHeaders,
          },
          body: manifest.backend.method === HttpMethod.Get ? undefined : JSON.stringify(input),
        });
        const result = (await response.json()) as {
          ok: boolean;
          value?: unknown;
          error?: { message: string };
        };
        return {
          content: [{ type: "text", text: JSON.stringify(result.ok ? result.value : result.error) }],
          isError: !result.ok,
        };
      },
    );
  }
  return server;
}
