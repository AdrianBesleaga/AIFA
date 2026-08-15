import { getAccessToken } from "./auth/oidc.js";
import {
  ErrorCode,
  HttpMethod,
  PermissionScope,
} from "../shared/architecture-enums.js";

export class ApiResponseError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiResponseError";
  }
}

export function isDefinitiveCommandFailure(cause: unknown): cause is ApiResponseError {
  return (
    cause instanceof ApiResponseError &&
    cause.status < 500 &&
    cause.code !== ErrorCode.RequestInProgress
  );
}

export function apiUrl(path: string): string {
  return `${import.meta.env.VITE_API_BASE_URL ?? ""}${path}`;
}

export function getApiAuthHeaders(): Record<string, string> {
  const token = !import.meta.env.DEV ? getAccessToken() : undefined;
  return import.meta.env.DEV
    ? {
        "x-aifa-tenant-id": "local-tenant",
        "x-aifa-user-id": "local-user",
        "x-aifa-scopes": Object.values(PermissionScope).join(","),
      }
    : token
      ? { authorization: `Bearer ${token}` }
      : {};
}

export async function commandApi<Value>(
  path: string,
  commandId: string,
  input: unknown,
  method: HttpMethod = HttpMethod.Post,
): Promise<Value> {
  return api<Value>(path, {
    method,
    headers: { "idempotency-key": commandId },
    body: JSON.stringify(input),
  });
}

export async function api<Value>(path: string, options: RequestInit = {}): Promise<Value> {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      "content-type": "application/json",
      ...getApiAuthHeaders(),
      ...options.headers,
    },
  });
  const result = (await response.json()) as {
    ok: boolean;
    value?: Value;
    error?: { code?: string; message: string };
  };
  if (!response.ok || !result.ok)
    throw new ApiResponseError(
      result.error?.message ?? "Request failed",
      response.status,
      result.error?.code,
    );
  return result.value as Value;
}
