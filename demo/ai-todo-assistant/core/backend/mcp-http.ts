import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Actor } from "../shared/aifa.js";
import type { FeatureManifest } from "../shared/feature-manifest.js";
import type { ActorResolver } from "./http/authorization-middleware.js";
import { createFeatureMcpServer } from "./mcp-server.js";

export function createRemoteMcpHandler(options: {
  manifests: readonly FeatureManifest[];
  resolveActor: ActorResolver;
  apiBaseUrl: string;
  resourceUrl: string;
  authorizationServer?: string;
}) {
  const metadataUrl = new URL("/.well-known/oauth-protected-resource", options.resourceUrl).href;
  function allowedFor(actor: Actor): FeatureManifest[] {
    const scopes = new Set(actor.scopes);
    return options.manifests.filter(
      ({ mcp, backend }) => mcp && backend.requiredScopes.every((scope) => scopes.has(scope)),
    );
  }
  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    const pathname = new URL(request.url ?? "/", options.resourceUrl).pathname;
    if (pathname === "/.well-known/oauth-protected-resource") {
      response.writeHead(200, { "content-type": "application/json" }).end(
        JSON.stringify({
          resource: options.resourceUrl,
          ...(options.authorizationServer
            ? { authorization_servers: [options.authorizationServer] }
            : {}),
          bearer_methods_supported: ["header"],
          scopes_supported: [
            ...new Set(options.manifests.flatMap(({ backend }) => backend.requiredScopes)),
          ],
        }),
      );
      return true;
    }
    if (pathname !== "/mcp") return false;
    const actor = await options.resolveActor(request.headers);
    if (!actor) {
      response
        .writeHead(401, {
          "content-type": "application/json",
          "www-authenticate": `Bearer resource_metadata="${metadataUrl}"`,
        })
        .end(JSON.stringify({ error: "invalid_token" }));
      return true;
    }
    if (request.method !== "POST") {
      response.writeHead(405, { allow: "POST" }).end();
      return true;
    }
    const actorHeaders: Record<string, string> = request.headers.authorization
      ? { authorization: request.headers.authorization }
      : {
          "x-aifa-tenant-id": actor.tenantId,
          "x-aifa-user-id": actor.userId,
          "x-aifa-scopes": actor.scopes.join(","),
        };
    const server = createFeatureMcpServer(allowedFor(actor), actorHeaders, options.apiBaseUrl);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    try {
      await server.connect(transport);
      await transport.handleRequest(request, response);
    } finally {
      await transport.close();
      await server.close();
    }
    return true;
  };
}
