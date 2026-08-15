import { fail, ok } from "./feature.js";

export function createAifaRuntime({ taskStore, idFactory = createIdFactory(), clock = () => new Date() }) {
  const auditLog = [];

  const allCapabilities = {
    "id.create": async () => idFactory.next(),
    "clock.now": async () => clock().toISOString(),
    "task.create": async ({ task }) => taskStore.create(task),
    "task.load": async ({ taskId }) => taskStore.load(taskId),
    "task.save": async ({ task }) => taskStore.save(task),
    "task.delete": async ({ taskId }) => taskStore.delete(taskId),
    "task.list": async () => taskStore.list(),
    "audit.record": async (entry) => {
      auditLog.push({
        ...entry,
        recordedAt: clock().toISOString(),
      });
    },
  };

  function bindCapabilities(feature) {
    const allowed = new Set(feature.capabilities);

    return new Proxy(
      {},
      {
        get(_target, capabilityName) {
          if (typeof capabilityName !== "string") {
            return undefined;
          }

          if (!allowed.has(capabilityName)) {
            return async () =>
              fail("capability_not_allowed", `Feature '${feature.name}' cannot use '${capabilityName}'`);
          }

          const capability = allCapabilities[capabilityName];

          if (!capability) {
            return async () => fail("capability_missing", `Runtime does not provide '${capabilityName}'`);
          }

          return capability;
        },
      },
    );
  }

  async function run(feature, input, actor = { id: "demo-user" }, metadata = {}) {
    return feature.execute({
      input,
      actor,
      metadata,
      capabilities: bindCapabilities(feature),
      ok,
      fail,
    });
  }

  return {
    auditLog,
    run,
  };
}

function createIdFactory() {
  return {
    next() {
      if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
      }

      return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    },
  };
}

