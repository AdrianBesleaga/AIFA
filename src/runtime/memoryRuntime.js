import { fail, ok } from "./feature.js";

export function createMemoryRuntime(seed = {}) {
  const state = {
    projects: new Map(Object.entries(seed.projects ?? {})),
    auditLog: [],
  };

  const allCapabilities = {
    "project.load": async ({ projectId }) => state.projects.get(projectId) ?? null,
    "project.save": async ({ project }) => {
      state.projects.set(project.id, project);
      return project;
    },
    "permission.check": async ({ actor, permission, resource }) => {
      return (
        actor.permissions?.includes(permission) && resource.organizationId === actor.organizationId
      );
    },
    "audit.record": async (entry) => {
      state.auditLog.push({
        ...entry,
        recordedAt: new Date().toISOString(),
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
              fail(
                "capability_not_allowed",
                `Feature '${feature.name}' cannot use '${capabilityName}'`,
              );
          }

          const capability = allCapabilities[capabilityName];
          if (!capability) {
            return async () =>
              fail("capability_missing", `Runtime does not provide '${capabilityName}'`);
          }

          return capability;
        },
      },
    );
  }

  async function run(feature, input, actor, metadata = {}) {
    const context = {
      input,
      actor,
      metadata,
      capabilities: bindCapabilities(feature),
      ok,
      fail,
    };

    return feature.execute(context);
  }

  return {
    run,
    state,
  };
}
