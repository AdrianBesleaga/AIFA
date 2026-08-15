# Core Implementation Plan

## Responsibility

`core/` provides composition and infrastructure. It does not contain task or AI-assistant business behavior.

## Folder Layout

```txt
core/
  shared/
    enums.ts
    task.ts
    feature.ts
    feature-manifest.ts
    mcp-tool.ts
  backend/
    runtime/
    capabilities/
    database/
    discovery/
    http/
    mcp/
    server.ts
  frontend/
    app-shell/
    slots/
    api/
    theme/
    discovery/
  architecture/
contexts/
  task-management/
    domain/
    features/
  ai-planning/
    domain/
    features/
```

## Shared Contracts

`shared/enums.ts` defines closed internal sets with TypeScript enums:

- `FeatureName`
- `CapabilityName`
- `SlotName`
- `TaskPriority`
- `TaskCategory`
- `TaskStatus`
- `ApiErrorCode`
- `AuditEventType`
- `HttpMethod`

`shared/task.ts` defines the MongoDB-persisted `Task` model. It uses `TaskCategory`, `TaskPriority`, and `TaskStatus`, never raw category, status, or priority strings. Initial category enum values are Work, Personal, Sport, Shopping, and Other; initial status enum values are Todo, InProgress, and Completed.

`shared/feature.ts` defines `AifaFeature<Input, Output>`, `FeatureContext`, `FeatureResult`, and explicit failure results. A feature context contains only input, actor, metadata, declared capabilities, `ok`, and `fail`.

`shared/feature-manifest.ts` defines a manifest that joins a feature-local backend registration and frontend registration under one `FeatureName`.

## Dynamic Registration

Every feature contains `feature.definition.json`, validated against `core/architecture/feature-definition.schema.json`, and exports `manifest.ts` from its own folder. The JSON definition is the machine-readable technical work contract; the TypeScript manifest binds it to executable backend and frontend registrations.

A manifest exposes:

```ts
export const manifest: FeatureManifest = {
  name: FeatureName.CreateTask,
  backend: { route, method, feature },
  frontend: { contributions },
};
```

### Backend discovery

`core/backend/discovery/discoverFeatures.ts` reads `contexts/*/features/*/feature.definition.json`, validates the schema and dependency DAG, imports the corresponding `manifest.ts`, and returns a deterministic list ordered by `FeatureName`.

Validation fails at startup for duplicate feature names, duplicate method-and-route pairs, duplicate slot contribution names, unknown enum values, or a capability not declared by a feature.

Feature manifests may also expose an MCP tool definition. `core/backend/mcp/` dynamically discovers those definitions and registers MCP tools that invoke the exact same AIFA feature. MCP clients therefore cannot bypass business validation or audit records.

The HTTP router receives discovered route registrations and invokes the declared AIFA feature. It contains no task-specific switch statements.

### Frontend discovery

`core/frontend/discovery/discoverFeatures.ts` uses Vite `import.meta.glob` to load every `contexts/*/features/*/manifest.ts`. It registers each frontend contribution with the typed slot registry in deterministic order.

The React app shell knows only the slot contract; it never imports a product feature directly.

## Backend Infrastructure

### MongoDB

`core/backend/database/mongo.ts` owns one MongoDB client connection using `MONGODB_URI` and exposes typed collection access. Feature code never imports this module.

`core/backend/capabilities/taskCapabilities.ts` adapts MongoDB operations to runtime capabilities such as `TaskCreate`, `TaskLoad`, `TaskSave`, and `TaskList`.

`core/backend/capabilities/assistantCapabilities.ts` will expose the AI provider through an `AssistantGenerateTaskPlan` capability. The provider is configured in core; the AI feature receives only the capability.

`core/backend/capabilities/ollamaAssistantProvider.ts` is the initial provider adapter. It calls a locally configured Ollama instance and maps its response into typed task suggestions. Cloud providers can be added through the same interface without changing the AI feature.

### Runtime

The runtime grants a feature only its manifest-declared capability enums. Attempts to access an undeclared capability return `ApiErrorCode.CapabilityNotAllowed`. Runtime-owned auditing records `AuditEventType` values in MongoDB.

## Frontend Infrastructure

The app shell uses MUI only: `ThemeProvider`, `CssBaseline`, `Container`, `Stack`, `Paper`, `AppBar`, and standard MUI controls. Do not create custom CSS components.

`core/frontend/slots/Slot.tsx` renders contributions registered for a `SlotName`. Every slot has a TypeScript model interface keyed by `SlotName`; contributions are type-checked against that model.

The initial app-shell slots are:

- `TaskComposer`
- `TaskList`
- `TaskRowActions`
- `TaskSummary`
- `AssistantPanel`

## Cross-Cutting Tests

- Manifest discovery rejects duplicates and produces a stable order.
- The runtime denies undeclared capabilities.
- Route registration invokes a discovered feature rather than hard-coded product logic.
- Slot registration validates models and ordered contributions.
- MongoDB integration tests run against a disposable test database.
- Feature-definition JSON validates against the schema and dependency graph.
- dependency-cruiser enforces `core/`, bounded-context, feature, and adapter import boundaries.
