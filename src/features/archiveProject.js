import { defineFeature } from "../runtime/feature.js";

export const archiveProject = defineFeature({
  name: "archive-project",
  description: "Archive one project when the actor has permission.",
  input: {
    projectId: "string",
  },
  output: {
    projectId: "string",
    archived: "boolean",
  },
  capabilities: ["project.load", "project.save", "permission.check", "audit.record"],

  async execute(context) {
    const project = await context.capabilities["project.load"]({
      projectId: context.input.projectId,
    });

    if (!project) {
      return context.fail("not_found", "Project was not found", {
        projectId: context.input.projectId,
      });
    }

    const allowed = await context.capabilities["permission.check"]({
      actor: context.actor,
      permission: "project.archive",
      resource: project,
    });

    if (!allowed) {
      return context.fail("not_allowed", "Actor cannot archive this project", {
        projectId: project.id,
      });
    }

    if (!project.archived) {
      await context.capabilities["project.save"]({
        project: {
          ...project,
          archived: true,
        },
      });
    }

    await context.capabilities["audit.record"]({
      type: "project.archived",
      actorId: context.actor.id,
      projectId: project.id,
    });

    return context.ok({
      projectId: project.id,
      archived: true,
    });
  },
});

