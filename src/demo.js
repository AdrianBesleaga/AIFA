import { archiveProject } from "./features/archiveProject.js";
import { createMemoryRuntime } from "./runtime/memoryRuntime.js";

const runtime = createMemoryRuntime({
  projects: {
    "project-1": {
      id: "project-1",
      name: "AIFA PoC",
      organizationId: "org-1",
      archived: false,
    },
  },
});

const actor = {
  id: "user-1",
  organizationId: "org-1",
  permissions: ["project.archive"],
};

const result = await runtime.run(archiveProject, { projectId: "project-1" }, actor);

console.log(JSON.stringify(result, null, 2));
