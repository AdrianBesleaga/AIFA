import type {
  CapabilityName,
  DomainEventType,
  ErrorCode,
} from "./architecture-enums.js";
import type { FeatureName } from "./generated/feature-names.js";

export interface Actor {
  tenantId: string;
  userId: string;
  scopes: readonly string[];
}

export interface RequestMetadata {
  correlationId: string;
  causationId: string;
  idempotencyKey?: string;
}

export interface FeatureFailure {
  ok: false;
  error: { code: ErrorCode; message: string; details: Record<string, unknown> };
}

export interface FeatureSuccess<Value> {
  ok: true;
  value: Value;
}
export type FeatureResult<Value> = FeatureSuccess<Value> | FeatureFailure;

export interface FeatureContext<Input, Capabilities> {
  input: Input;
  actor: Actor;
  metadata: RequestMetadata;
  capabilities: Capabilities;
  ok<Value>(value: Value): FeatureSuccess<Value>;
  fail(code: ErrorCode, message: string, details?: Record<string, unknown>): FeatureFailure;
}

export interface AifaFeature<Input, Output, Capabilities extends object> {
  name: FeatureName;
  capabilities: readonly CapabilityName[];
  execute(context: FeatureContext<Input, Capabilities>): Promise<FeatureResult<Output>>;
}

export interface PlatformCapabilities {
  IdCreate(): Promise<string>;
  ClockNow(): Promise<string>;
  DomainEventEmit(input: {
    eventType: DomainEventType;
    data: Record<string, string | number | null>;
  }): Promise<void>;
}

export const ok = <Value>(value: Value): FeatureSuccess<Value> => ({ ok: true, value });
export const fail = (
  code: ErrorCode,
  message: string,
  details: Record<string, unknown> = {},
): FeatureFailure => ({ ok: false, error: { code, message, details } });
