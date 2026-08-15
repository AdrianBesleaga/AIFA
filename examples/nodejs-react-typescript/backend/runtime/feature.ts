import type { Actor, RuntimeCapabilities } from "../types";

export interface FeatureSuccess<Value> {
  ok: true;
  value: Value;
}

export interface FeatureFailure {
  ok: false;
  error: { code: string; message: string; details: Record<string, unknown> };
}

export type FeatureResult<Value> = FeatureSuccess<Value> | FeatureFailure;

export interface FeatureContext<Input> {
  input: Input;
  actor: Actor;
  metadata: Record<string, unknown>;
  capabilities: RuntimeCapabilities;
  ok: <Value>(value: Value) => FeatureSuccess<Value>;
  fail: (code: string, message: string, details?: Record<string, unknown>) => FeatureFailure;
}

export interface Feature<Input, Output> {
  name: string;
  description: string;
  input: Record<string, string>;
  output: Record<string, string>;
  capabilities: (keyof RuntimeCapabilities)[];
  execute(context: FeatureContext<Input>): Promise<FeatureResult<Output>>;
}

export function defineFeature<Input, Output>(
  definition: Feature<Input, Output>,
): Readonly<Feature<Input, Output>> {
  const requiredFields = ["name", "description", "input", "output", "capabilities", "execute"];
  for (const field of requiredFields) {
    if (!(field in definition)) throw new Error(`Feature is missing required field: ${field}`);
  }
  if (!Array.isArray(definition.capabilities))
    throw new Error("Feature capabilities must be an array");
  if (typeof definition.execute !== "function")
    throw new Error("Feature execute must be a function");
  return Object.freeze({ ...definition });
}

export function ok<Value>(value: Value): FeatureSuccess<Value> {
  return { ok: true, value };
}

export function fail(
  code: string,
  message: string,
  details: Record<string, unknown> = {},
): FeatureFailure {
  return { ok: false, error: { code, message, details } };
}
