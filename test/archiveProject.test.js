import assert from "node:assert/strict";
import test from "node:test";

import { archiveProject } from "../src/features/archiveProject.js";
import { createMemoryRuntime } from "../src/runtime/memoryRuntime.js";

function createRuntime() {
  return createMemoryRuntime({
    projects: {
      "project-1": {
        id: "project-1",
        name: "Test Project",
        organizationId: "org-1",
        archived: false,
      },
      "project-2": {
        id: "project-2",
        name: "Already Archived",
        organizationId: "org-1",
        archived: true,
      },
    },
  });
}

const authorizedActor = {
  id: "user-1",
  organizationId: "org-1",
  permissions: ["project.archive"],
};

test("archives a project", async () => {
  const runtime = createRuntime();

  const result = await runtime.run(archiveProject, { projectId: "project-1" }, authorizedActor);

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    projectId: "project-1",
    archived: true,
  });
  assert.equal(runtime.state.projects.get("project-1").archived, true);
  assert.equal(runtime.state.auditLog.length, 1);
});

test("returns success for an already archived project", async () => {
  const runtime = createRuntime();

  const result = await runtime.run(archiveProject, { projectId: "project-2" }, authorizedActor);

  assert.equal(result.ok, true);
  assert.equal(runtime.state.projects.get("project-2").archived, true);
});

test("rejects unauthorized actors", async () => {
  const runtime = createRuntime();

  const result = await runtime.run(
    archiveProject,
    { projectId: "project-1" },
    {
      id: "user-2",
      organizationId: "org-1",
      permissions: [],
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "not_allowed");
  assert.equal(runtime.state.projects.get("project-1").archived, false);
});

test("returns not_found for missing projects", async () => {
  const runtime = createRuntime();

  const result = await runtime.run(archiveProject, { projectId: "missing" }, authorizedActor);

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "not_found");
});

