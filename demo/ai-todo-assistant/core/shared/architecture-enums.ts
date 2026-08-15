export enum CapabilityName {
  TaskCreate = "TaskCreate",
  TaskList = "TaskList",
  TaskLoad = "TaskLoad",
  TaskSave = "TaskSave",
  TaskDelete = "TaskDelete",
  IdCreate = "IdCreate",
  ClockNow = "ClockNow",
  DomainEventEmit = "DomainEventEmit",
  AssistantGenerateTaskPlan = "AssistantGenerateTaskPlan",
  TaskPlanCreate = "TaskPlanCreate",
}

export enum DomainEventType {
  TaskCreatedV1 = "TaskCreatedV1",
  TaskStatusChangedV1 = "TaskStatusChangedV1",
  TaskDeletedV1 = "TaskDeletedV1",
  TaskPlanGeneratedV1 = "TaskPlanGeneratedV1",
}

export enum OutboxStatus {
  Pending = "Pending",
  Processing = "Processing",
  Delivered = "Delivered",
  Failed = "Failed",
  DeadLetter = "DeadLetter",
}

export enum SlotName {
  AppHeader = "AppHeader",
  AppNavigation = "AppNavigation",
  AppContent = "AppContent",
  AppFooter = "AppFooter",
  TaskComposer = "TaskComposer",
  TaskList = "TaskList",
  TaskRowActions = "TaskRowActions",
  AssistantPanel = "AssistantPanel",
  TaskSuggestionActions = "TaskSuggestionActions",
  SettingsPanel = "SettingsPanel",
}

export enum AppSurface {
  Landing = "landing",
  Dashboard = "dashboard",
  Tasks = "tasks",
  Planner = "planner",
  Settings = "settings",
}

export enum PermissionScope {
  TaskRead = "TaskRead",
  TaskWrite = "TaskWrite",
  TaskDelete = "TaskDelete",
  AssistantPlanGenerate = "AssistantPlanGenerate",
  SettingsRead = "SettingsRead",
  EventRead = "EventRead",
}

export enum HttpMethod {
  Get = "GET",
  Post = "POST",
  Patch = "PATCH",
  Delete = "DELETE",
}

export enum ErrorCode {
  CapabilityNotAllowed = "CapabilityNotAllowed",
  CapabilityMissing = "CapabilityMissing",
  ConfirmationRequired = "ConfirmationRequired",
  Forbidden = "Forbidden",
  IdempotencyKeyReused = "IdempotencyKeyReused",
  InvalidInput = "InvalidInput",
  InvalidOutput = "InvalidOutput",
  InvalidJson = "InvalidJson",
  InvalidStatusTransition = "InvalidStatusTransition",
  AssistantResponseInvalid = "AssistantResponseInvalid",
  ProviderUnavailable = "ProviderUnavailable",
  InternalError = "InternalError",
  NotAuthorized = "NotAuthorized",
  NotFound = "NotFound",
  NotFoundOrVersionConflict = "NotFoundOrVersionConflict",
  RequestInProgress = "RequestInProgress",
  VersionConflict = "VersionConflict",
}
