import type { AifaFeature } from "./aifa.js";
import type {
  DomainEventType,
  HttpMethod,
  PermissionScope,
  SlotName,
} from "./architecture-enums.js";
import type { FeatureName } from "./generated/feature-names.js";

export interface ContractValidationError {
  path: string;
  message: string;
}

export interface ExecutableContract {
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  validateInput(value: unknown): ContractValidationError[];
  validateOutput(value: unknown): ContractValidationError[];
  validateEvent(value: unknown): ContractValidationError[];
}

export interface BackendRegistration {
  method: HttpMethod;
  route: string;
  feature: AifaFeature<unknown, unknown, Record<string, unknown>>;
  requiredScopes: readonly PermissionScope[];
  mapOutput?(value: unknown): unknown;
  contract?: ExecutableContract;
}

export interface FrontendContribution {
  slot: SlotName;
  name: string;
  order?: number;
}

export interface FrontendEventConsumerDeclaration {
  name: string;
  eventType: DomainEventType;
  contract: string;
}

export interface FeatureManifest {
  name: FeatureName;
  backend: BackendRegistration;
  frontend: {
    contributions: FrontendContribution[];
    eventConsumers?: FrontendEventConsumerDeclaration[];
  };
  mcp?: { toolName: string; description?: string; requiresConfirmation?: boolean };
}
