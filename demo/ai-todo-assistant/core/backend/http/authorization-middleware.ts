import type { IncomingHttpHeaders } from "node:http";
import type { Actor } from "../../shared/aifa.js";
import { ErrorCode, type PermissionScope } from "../../shared/architecture-enums.js";

export type ActorResolver = (headers: IncomingHttpHeaders) => Actor | null | Promise<Actor | null>;

export type AuthorizationResult =
  | { ok: true; actor: Actor }
  | {
      ok: false;
      status: 401 | 403;
      code: ErrorCode.NotAuthorized | ErrorCode.Forbidden;
      message: string;
    };

export function createAuthorizationMiddleware(resolveActor: ActorResolver) {
  return async (
    headers: IncomingHttpHeaders,
    requiredScopes: readonly PermissionScope[],
  ): Promise<AuthorizationResult> => {
    const actor = await resolveActor(headers);
    if (!actor)
      return {
        ok: false,
        status: 401,
        code: ErrorCode.NotAuthorized,
        message: "An actor is required",
      };
    if (!requiredScopes.every((scope) => actor.scopes.includes(scope)))
      return {
        ok: false,
        status: 403,
        code: ErrorCode.Forbidden,
        message: "The actor lacks a required permission scope",
      };
    return { ok: true, actor };
  };
}
