export enum FeatureName {
  CreateTask = "create-task",
  ListTasks = "list-tasks",
  ChangeTaskStatus = "change-task-status",
  DeleteTask = "delete-task",
  GenerateTaskPlan = "generate-task-plan",
}

export enum CapabilityName {
  TaskCreate = "TaskCreate",
  TaskList = "TaskList",
  TaskLoad = "TaskLoad",
  TaskSave = "TaskSave",
  TaskDelete = "TaskDelete",
  IdCreate = "IdCreate",
  ClockNow = "ClockNow",
  AuditRecord = "AuditRecord",
  AssistantGenerateTaskPlan = "AssistantGenerateTaskPlan",
}

export enum SlotName {
  TaskComposer = "TaskComposer",
  TaskList = "TaskList",
  TaskSummary = "TaskSummary",
  TaskRowActions = "TaskRowActions",
  AssistantPanel = "AssistantPanel",
}

export enum PermissionScope {
  TaskRead = "TaskRead",
  TaskWrite = "TaskWrite",
  TaskDelete = "TaskDelete",
  AssistantPlanGenerate = "AssistantPlanGenerate",
}

export enum HttpMethod {
  Get = "GET",
  Post = "POST",
  Patch = "PATCH",
  Delete = "DELETE",
}
