import { getAccessToken } from "./auth/oidc.js";

export async function api<Value>(path: string, options: RequestInit = {}): Promise<Value> {
  const developmentHeaders: Record<string, string> = import.meta.env.DEV
    ? {
        "x-aifa-tenant-id": "local-tenant",
        "x-aifa-user-id": "local-user",
        "x-aifa-scopes":
          "TaskRead,TaskWrite,TaskDelete,AssistantPlanGenerate,SettingsRead",
      }
    : {};
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ""}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...developmentHeaders,
      ...(!import.meta.env.DEV && getAccessToken()
        ? { authorization: `Bearer ${getAccessToken()}` }
        : {}),
      ...options.headers,
    },
  });
  const result = (await response.json()) as {
    ok: boolean;
    value?: Value;
    error?: { message: string };
  };
  if (!response.ok || !result.ok) throw new Error(result.error?.message ?? "Request failed");
  return result.value as Value;
}
