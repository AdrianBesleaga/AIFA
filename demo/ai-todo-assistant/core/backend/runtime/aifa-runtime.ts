import {
  fail,
  ok,
  type AifaFeature,
  type Actor,
  type FeatureResult,
  type RequestMetadata,
} from "../../shared/aifa.js";
import { CapabilityName, ErrorCode } from "../../shared/architecture-enums.js";

export function createAifaRuntime<Capabilities extends Record<string, unknown>>(
  allCapabilities: Capabilities,
) {
  class CapabilityAccessError extends Error {
    constructor(
      readonly code: ErrorCode.CapabilityMissing | ErrorCode.CapabilityNotAllowed,
      message: string,
    ) {
      super(message);
    }
  }

  function bindCapabilities<FeatureCapabilities extends object>(
    allowedNames: readonly CapabilityName[],
  ): FeatureCapabilities {
    const allowed = new Set(allowedNames);
    return new Proxy(allCapabilities, {
      get(target, name: string | symbol) {
        if (typeof name !== "string") return undefined;
        if (!allowed.has(name as CapabilityName))
          return async () => {
            throw new CapabilityAccessError(
              ErrorCode.CapabilityNotAllowed,
              `Capability '${name}' is not declared for this feature`,
            );
          };
        const capability = target[name];
        return capability;
      },
    }) as unknown as FeatureCapabilities;
  }

  async function run<Input, Output, FeatureCapabilities extends object>(
    feature: AifaFeature<Input, Output, FeatureCapabilities>,
    input: Input,
    actor: Actor,
    metadata: RequestMetadata,
  ): Promise<FeatureResult<Output>> {
    const missing = feature.capabilities.filter(
      (name) => typeof allCapabilities[name] !== "function",
    );
    if (missing.length)
      return fail(ErrorCode.CapabilityMissing, "Required capabilities are unavailable", {
        capabilities: missing,
      });
    try {
      return await feature.execute({
        input,
        actor,
        metadata,
        capabilities: bindCapabilities<FeatureCapabilities>(feature.capabilities),
        ok,
        fail,
      });
    } catch (cause) {
      if (cause instanceof CapabilityAccessError) return fail(cause.code, cause.message);
      throw cause;
    }
  }

  return { run };
}
