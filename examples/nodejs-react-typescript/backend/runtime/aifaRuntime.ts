import { fail, ok, type Feature, type FeatureResult } from "./feature";
import type { Actor, AuditEntry, RuntimeCapabilities, TaskStore } from "../types";

interface IdFactory {
  next(): string;
}
interface RuntimeOptions {
  taskStore: TaskStore;
  idFactory?: IdFactory;
  clock?: () => Date;
}

export function createAifaRuntime({
  taskStore,
  idFactory = createIdFactory(),
  clock = () => new Date(),
}: RuntimeOptions) {
  const auditLog: AuditEntry[] = [];
  const allCapabilities: RuntimeCapabilities = {
    "id.create": async () => idFactory.next(),
    "clock.now": async () => clock().toISOString(),
    "task.create": async ({ task }) => taskStore.create(task),
    "task.load": async ({ taskId }) => taskStore.load(taskId),
    "task.save": async ({ task }) => taskStore.save(task),
    "task.delete": async ({ taskId }) => taskStore.delete(taskId),
    "task.list": async () => taskStore.list(),
    "audit.record": async (entry) => {
      auditLog.push({ ...entry, recordedAt: clock().toISOString() });
    },
  };

  function bindCapabilities(feature: Feature<unknown, unknown>): RuntimeCapabilities {
    const allowed = new Set(feature.capabilities);
    return new Proxy(allCapabilities, {
      get(target, capabilityName) {
        if (typeof capabilityName !== "string") return undefined;
        if (!allowed.has(capabilityName as keyof RuntimeCapabilities)) {
          return async () =>
            fail(
              "capability_not_allowed",
              `Feature '${feature.name}' cannot use '${capabilityName}'`,
            );
        }
        return (
          target[capabilityName as keyof RuntimeCapabilities] ??
          (async () => fail("capability_missing", `Runtime does not provide '${capabilityName}'`))
        );
      },
    });
  }

  async function run<Input, Output>(
    feature: Feature<Input, Output>,
    input: Input,
    actor: Actor = { id: "demo-user" },
    metadata: Record<string, unknown> = {},
  ): Promise<FeatureResult<Output>> {
    return feature.execute({
      input,
      actor,
      metadata,
      capabilities: bindCapabilities(feature),
      ok,
      fail,
    });
  }

  return { auditLog, run };
}

function createIdFactory(): IdFactory {
  return {
    next: () =>
      globalThis.crypto?.randomUUID?.() ??
      `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  };
}
