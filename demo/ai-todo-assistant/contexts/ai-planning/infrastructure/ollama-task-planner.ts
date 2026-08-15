import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import type {
  GenerateTaskPlanRequest,
  TaskPlanProviderResult,
  TaskPlanSuggestion,
} from "../domain/task-planning.js";
import {
  TaskCategory,
  TaskPriority,
} from "../../task-management/contracts/v1/task-taxonomy.js";
const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020").default as typeof import("ajv/dist/2020.js").Ajv2020;

interface OllamaResponse {
  response?: string;
}

const promptVersion = "task-plan-v1";
const maximumResponseBytes = 262_144;
const suggestionSchema = JSON.parse(
  await readFile(new URL("../contracts/v1/task-plan-suggestion.schema.json", import.meta.url), "utf8"),
) as Record<string, unknown>;
const { $schema: _schema, $id: _id, ...suggestionShape } = suggestionSchema;
const suggestionsSchema = {
  type: "array",
  minItems: 1,
  maxItems: 10,
  items: suggestionShape,
} as const;
const validateSuggestions = new Ajv2020({ allErrors: true, strict: false }).compile(
  suggestionsSchema,
);

export interface ProviderHealth {
  requests: number;
  successes: number;
  failures: number;
  rejected: number;
  active: number;
  circuitOpenUntil?: string;
  lastLatencyMs?: number;
}
export type OllamaTaskPlanner = ((
  input: GenerateTaskPlanRequest,
) => Promise<TaskPlanProviderResult>) & { health(): ProviderHealth };

export function createOllamaTaskPlanner(
  baseUrl: string,
  model: string,
  dependencies: { fetch?: typeof fetch; now?: () => number } = {},
): OllamaTaskPlanner {
  const request = dependencies.fetch ?? fetch;
  const now = dependencies.now ?? Date.now;
  const health: ProviderHealth = { requests: 0, successes: 0, failures: 0, rejected: 0, active: 0 };
  const recentRequests: number[] = [];
  let consecutiveFailures = 0;
  let circuitOpenUntil = 0;
  const planner = async (input: GenerateTaskPlanRequest): Promise<TaskPlanProviderResult> => {
    const currentTime = now();
    while (recentRequests[0] !== undefined && recentRequests[0] < currentTime - 60_000)
      recentRequests.shift();
    if (circuitOpenUntil > currentTime || health.active >= 4 || recentRequests.length >= 30) {
      health.rejected++;
      return {
        ok: false,
        code: "ProviderUnavailable",
        message: circuitOpenUntil > currentTime ? "AI provider circuit is open" : "AI provider is rate limited",
      };
    }
    recentRequests.push(currentTime);
    health.requests++;
    health.active++;
    try {
      const startedAt = performance.now();
      const prompt = `Create 3 concise, reviewable task suggestions for this goal: ${input.goal}. Use category values ${Object.values(TaskCategory).join(", ")} and priority values ${Object.values(TaskPriority).join(", ")}. Default to category=${input.category} and priority=${input.priority}.`;
      let lastFailure = "AI provider is unavailable";
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
        const response = await request(`${baseUrl}/api/generate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model,
            prompt,
            stream: false,
            format: suggestionsSchema,
            options: { temperature: 0.2 },
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) {
          lastFailure = `AI provider returned HTTP ${response.status}`;
          if (response.status < 500 && response.status !== 429) break;
          continue;
        }
        const raw = await response.text();
        if (Buffer.byteLength(raw) > maximumResponseBytes)
          return failure("AssistantResponseInvalid", "AI response was too large");
        const payload = JSON.parse(raw) as OllamaResponse;
        const parsed: unknown = JSON.parse(payload.response ?? "null");
        if (!validateSuggestions(parsed))
          return failure(
            "AssistantResponseInvalid",
            "AI response did not satisfy the task-plan contract",
          );
        consecutiveFailures = 0;
        circuitOpenUntil = 0;
        health.successes++;
        health.lastLatencyMs = Math.round(performance.now() - startedAt);
        return {
          ok: true,
          suggestions: parsed as TaskPlanSuggestion[],
          provenance: {
            provider: "ollama",
            model,
            promptVersion,
            latencyMs: health.lastLatencyMs,
          },
        };
        } catch (cause) {
          lastFailure = cause instanceof Error ? cause.message : lastFailure;
        }
      }
      return failure("ProviderUnavailable", lastFailure);
      function failure(
        code: "ProviderUnavailable" | "AssistantResponseInvalid",
        message: string,
      ): TaskPlanProviderResult {
        health.failures++;
        health.lastLatencyMs = Math.round(performance.now() - startedAt);
        consecutiveFailures++;
        if (consecutiveFailures >= 3) {
          circuitOpenUntil = now() + 30_000;
          health.circuitOpenUntil = new Date(circuitOpenUntil).toISOString();
        }
        return { ok: false, code, message };
      }
    } finally {
      health.active--;
    }
  };
  const instrumented = planner as OllamaTaskPlanner;
  instrumented.health = () => ({ ...health });
  return instrumented;
}
