/* Generated from feature definitions. Do not edit manually. */
export const frontendModules = [
  {
    id: "generate-task-plan",
    slots: ["AssistantPanel"] as const,
    eventConsumers: [] as const,
    load: () => import("../../contexts/ai-planning/features/generate-task-plan/frontend/contribution.js"),
  },
  {
    id: "change-task-status",
    slots: ["TaskRowActions"] as const,
    eventConsumers: [{"name":"invalidate-task-collection-after-status-change","eventType":"TaskStatusChangedV1","contract":"task-management/contracts/events/v1/task-status-changed.schema.json"}] as const,
    load: () => import("../../contexts/task-management/features/change-task-status/frontend/contribution.js"),
  },
  {
    id: "create-task",
    slots: ["TaskComposer"] as const,
    eventConsumers: [{"name":"invalidate-task-collection-after-create","eventType":"TaskCreatedV1","contract":"task-management/contracts/events/v1/task-created.schema.json"}] as const,
    load: () => import("../../contexts/task-management/features/create-task/frontend/contribution.js"),
  },
  {
    id: "delete-task",
    slots: ["TaskRowActions"] as const,
    eventConsumers: [{"name":"invalidate-task-collection-after-delete","eventType":"TaskDeletedV1","contract":"task-management/contracts/events/v1/task-deleted.schema.json"}] as const,
    load: () => import("../../contexts/task-management/features/delete-task/frontend/contribution.js"),
  },
  {
    id: "list-tasks",
    slots: ["TaskList","AppHeader","AppNavigation","AppContent","AppFooter"] as const,
    eventConsumers: [] as const,
    load: () => import("../../contexts/task-management/features/list-tasks/frontend/contribution.js"),
  },
  {
    id: "manage-ai-settings",
    slots: ["AppNavigation","AppContent","SettingsPanel"] as const,
    eventConsumers: [] as const,
    load: () => import("../../contexts/workspace-settings/features/manage-ai-settings/frontend/contribution.js"),
  },
] as const;
