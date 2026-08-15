import type { IncomingHttpHeaders } from "node:http";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { PermissionScope } from "../../shared/architecture-enums.js";
import type { Actor } from "../../shared/aifa.js";
import { config, RuntimeEnvironment } from "../config.js";

const validScopes = new Set(Object.values(PermissionScope));
const oidcJwks = config.oidcJwksUrl ? createRemoteJWKSet(new URL(config.oidcJwksUrl)) : undefined;

function actor(
  tenantId: string | undefined,
  userId: string | undefined,
  scopes: readonly string[],
): Actor | null {
  return tenantId && userId
    ? {
        tenantId,
        userId,
        scopes: scopes.filter((scope): scope is PermissionScope =>
          validScopes.has(scope as PermissionScope),
        ),
      }
    : null;
}

export async function resolveActor(headers: IncomingHttpHeaders): Promise<Actor | null> {
  if (config.nodeEnv !== RuntimeEnvironment.Production) {
    const tenantId = headers["x-aifa-tenant-id"]?.toString() ?? config.demoTenantId;
    const userId = headers["x-aifa-user-id"]?.toString() ?? config.demoUserId;
    const scopes =
      headers["x-aifa-scopes"]?.toString().split(",") ?? Object.values(PermissionScope);
    return actor(tenantId, userId, scopes);
  }
  const token = headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token || !oidcJwks || !config.oidcIssuerUrl || !config.oidcAudience) return null;
  try {
    const { payload } = await jwtVerify(token, oidcJwks, {
      issuer: config.oidcIssuerUrl,
      audience: config.oidcAudience,
    });
    const scopes = typeof payload.scope === "string" ? payload.scope.split(" ") : [];
    return actor(
      typeof payload.tenant_id === "string" ? payload.tenant_id : undefined,
      payload.sub,
      scopes,
    );
  } catch {
    return null;
  }
}
