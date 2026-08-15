import "dotenv/config";

export enum RuntimeEnvironment {
  Development = "development",
  Test = "test",
  Production = "production",
}

const nodeEnv = (process.env.NODE_ENV ?? RuntimeEnvironment.Development) as RuntimeEnvironment;
if (!Object.values(RuntimeEnvironment).includes(nodeEnv))
  throw new Error("NODE_ENV must be development, test, or production");

export const config = {
  nodeEnv,
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3000),
  mongoDatabase: process.env.MONGODB_DATABASE ?? "ai_todo_assistant",
  mongoUri: process.env.MONGODB_URI,
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
  ollamaModel: process.env.OLLAMA_MODEL ?? "llama3.2",
  oidcIssuerUrl: process.env.OIDC_ISSUER_URL,
  oidcAudience: process.env.OIDC_AUDIENCE,
  oidcJwksUrl: process.env.OIDC_JWKS_URL,
  mcpAccessToken: process.env.MCP_ACCESS_TOKEN,
  demoTenantId: process.env.DEMO_TENANT_ID,
  demoUserId: process.env.DEMO_USER_ID,
  idempotencyLeaseMs: Number(process.env.IDEMPOTENCY_LEASE_MS ?? 300_000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://127.0.0.1:5173",
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? `http://${process.env.HOST ?? "127.0.0.1"}:${Number(process.env.PORT ?? 3000)}`,
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 30_000),
} as const;

if (!Number.isSafeInteger(config.port) || config.port < 1 || config.port > 65_535)
  throw new Error("PORT must be an integer between 1 and 65535");
if (!Number.isSafeInteger(config.idempotencyLeaseMs) || config.idempotencyLeaseMs < 1_000)
  throw new Error("IDEMPOTENCY_LEASE_MS must be a positive integer of at least 1000");
if (!Number.isSafeInteger(config.requestTimeoutMs) || config.requestTimeoutMs < 1_000)
  throw new Error("REQUEST_TIMEOUT_MS must be an integer of at least 1000");
for (const [name, value] of [
  ["OLLAMA_BASE_URL", config.ollamaBaseUrl],
  ["CORS_ORIGIN", config.corsOrigin],
  ["PUBLIC_BASE_URL", config.publicBaseUrl],
] as const) {
  try {
    new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL`);
  }
}

if (
  config.nodeEnv === RuntimeEnvironment.Production &&
  (!config.mongoUri || !config.oidcIssuerUrl || !config.oidcAudience || !config.oidcJwksUrl)
)
  throw new Error(
    "Production requires MONGODB_URI, OIDC_ISSUER_URL, OIDC_AUDIENCE, and OIDC_JWKS_URL",
  );
