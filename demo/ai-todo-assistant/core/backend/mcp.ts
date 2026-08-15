import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { config, RuntimeEnvironment } from "./config.js";
import { discoverFeatureManifests } from "./discovery/discover-features.js";
import { PermissionScope } from "../shared/architecture-enums.js";
import { createFeatureMcpServer } from "./mcp-server.js";

const appRoot = join(fileURLToPath(new URL("../..", import.meta.url)));
const manifests = await discoverFeatureManifests(join(appRoot, "contexts"));
const actorHeaders: Record<string, string> | undefined =
  config.nodeEnv === RuntimeEnvironment.Production
    ? config.mcpAccessToken
      ? { authorization: `Bearer ${config.mcpAccessToken}` }
      : undefined
    : config.demoTenantId && config.demoUserId
      ? {
          "x-aifa-tenant-id": config.demoTenantId,
          "x-aifa-user-id": config.demoUserId,
          "x-aifa-scopes": Object.values(PermissionScope).join(","),
        }
      : undefined;
if (!actorHeaders) throw new Error("MCP identity is not configured");
const server = createFeatureMcpServer(
  manifests,
  actorHeaders,
  `http://${config.host}:${config.port}`,
);
await server.connect(new StdioServerTransport());
