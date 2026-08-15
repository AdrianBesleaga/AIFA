# AIFA Architecture Diagrams

This document explains how AI Atomic Feature Architecture (AIFA) makes an application easy to extend on both the backend and frontend.

## 1. Complete architecture

The feature contract is the stable center of the architecture. Backend transports, infrastructure adapters, frontend contributions, and the application shell are replaceable parts around it.

```mermaid
flowchart LR
    subgraph Clients[Clients and entry points]
        Browser[Browser UI]
        ExternalAI[External AI client]
        APIClient[HTTP API client]
    end

    subgraph Frontend[Frontend composition]
        Shell[Application shell]
        SlotRegistry[Typed slot registry]
        FeatureUI[Feature UI contribution]

        Shell -->|publishes named slots| SlotRegistry
        SlotRegistry -->|renders contribution| FeatureUI
    end

    subgraph FeatureSlice[Atomic feature slice]
        Definition[feature.definition.json]
        Contracts[Input and output contracts]
        BackendFeature[Backend feature]
        FrontendContribution[Frontend contribution]
        Manifest[Executable manifest]

        Definition --- Contracts
        Definition --- Manifest
        Manifest --- BackendFeature
        Manifest --- FrontendContribution
    end

    subgraph Backend[Governed backend]
        HTTP[HTTP adapter]
        MCP[MCP adapter]
        Runtime[AIFA runtime]
        Capabilities[Tenant-bound capabilities]

        HTTP --> Runtime
        MCP --> Runtime
        Runtime -->|grants declared operations| Capabilities
    end

    subgraph Infrastructure[Replaceable infrastructure]
        Database[(MongoDB)]
        AIProvider[AI provider]
        Identity[Identity and authorization]
        Audit[Audit log]
        Outbox[Event outbox]
    end

    Browser --> Shell
    FeatureUI -->|calls the published contract| HTTP
    ExternalAI --> MCP
    APIClient --> HTTP

    FrontendContribution --> FeatureUI
    BackendFeature --> Runtime
    Runtime --> BackendFeature

    Capabilities --> Database
    Capabilities --> AIProvider
    Capabilities --> Identity
    Capabilities --> Audit
    Capabilities --> Outbox

    classDef feature fill:#322a67,stroke:#9c8cff,color:#ffffff,stroke-width:2px;
    classDef frontend fill:#123443,stroke:#63d9ff,color:#ffffff;
    classDef backend fill:#282442,stroke:#9c8cff,color:#ffffff;
    classDef infrastructure fill:#17362f,stroke:#5ce0b6,color:#ffffff;

    class Definition,Contracts,BackendFeature,FrontendContribution,Manifest feature;
    class Shell,SlotRegistry,FeatureUI frontend;
    class HTTP,MCP,Runtime,Capabilities backend;
    class Database,AIProvider,Identity,Audit,Outbox infrastructure;
```

### Why this is easy to extend

- The feature owns one understandable change surface.
- HTTP and MCP reuse the same feature operation.
- Features request capabilities instead of importing infrastructure.
- The application shell composes UI without importing product features.
- Contracts provide a shared language for developers, runtime validation, and AI agents.

## 2. Backend extension flow

Adding a backend capability means adding a local feature slice. Generic platform code discovers, validates, and exposes it.

```mermaid
flowchart LR
    subgraph NewFeature[New feature folder]
        FD[Feature definition]
        IC[Input contract]
        OC[Output contract]
        BF[Backend behavior]
        FM[Feature manifest]

        FD --> IC
        FD --> OC
        FD --> FM
        FM --> BF
    end

    subgraph Composition[Generic composition]
        Discover[Discover manifests]
        Validate[Validate contracts and dependencies]
        Register[Register route and MCP tool]

        Discover --> Validate --> Register
    end

    subgraph Invocation[Governed invocation]
        Authenticate[Resolve actor]
        ValidateInput[Validate input]
        CheckPolicy[Check scopes and command policy]
        Execute[Execute feature]
        ValidateOutput[Validate output]

        Authenticate --> ValidateInput
        ValidateInput --> CheckPolicy
        CheckPolicy --> Execute
        Execute --> ValidateOutput
    end

    subgraph Grants[Runtime capability grants]
        Persistence[Persistence]
        Assistant[AI provider]
        Clock[Clock and identifiers]
        Auditing[Audit and events]
        Transaction[Transaction and idempotency]
    end

    NewFeature --> Discover
    Register --> Authenticate
    Execute --> Persistence
    Execute --> Assistant
    Execute --> Clock
    Execute --> Auditing
    Execute --> Transaction

    classDef feature fill:#322a67,stroke:#9c8cff,color:#ffffff;
    classDef platform fill:#172735,stroke:#63d9ff,color:#ffffff;
    classDef runtime fill:#282442,stroke:#9c8cff,color:#ffffff;
    classDef capability fill:#17362f,stroke:#5ce0b6,color:#ffffff;

    class FD,IC,OC,BF,FM feature;
    class Discover,Validate,Register platform;
    class Authenticate,ValidateInput,CheckPolicy,Execute,ValidateOutput runtime;
    class Persistence,Assistant,Clock,Auditing,Transaction capability;
```

### Backend benefits

- **Low coupling:** features depend on capability contracts, not MongoDB, HTTP, MCP, or provider SDKs.
- **Replaceable infrastructure:** adapters can change without rewriting business behavior.
- **Consistent security:** HTTP and MCP pass through the same authorization and tenancy boundary.
- **Focused tests:** a feature can be tested with small capability fakes.
- **Safer commands:** idempotency, confirmation, concurrency, audit, and event requirements are explicit.
- **No route-list maintenance:** discovery composes new features automatically.

## 3. Frontend extension through UI slots

The application shell owns layout and publishes named extension points. Feature modules provide UI contributions for those slots.

```mermaid
flowchart LR
    subgraph Contributions[Feature-owned UI contributions]
        Planner[Generate Task Plan UI]
        Composer[Create Task UI]
        Status[Change Status UI]
        Delete[Delete Task UI]
        Settings[AI Settings UI]
    end

    subgraph Registry[Typed slot registry]
        DiscoverUI[Discover contributions]
        TypeCheck[Check slot model]
        Order[Order contributions]
        Render[Render matching contributions]

        DiscoverUI --> TypeCheck --> Order --> Render
    end

    subgraph Shell[Application shell]
        HeaderSlot[AppHeader slot]
        NavigationSlot[AppNavigation slot]
        ContentSlot[AppContent slot]
        AssistantSlot[AssistantPanel slot]
        ComposerSlot[TaskComposer slot]
        RowActionsSlot[TaskRowActions slot]
        SettingsSlot[SettingsPanel slot]
    end

    Planner -->|AssistantPanel| DiscoverUI
    Composer -->|TaskComposer| DiscoverUI
    Status -->|TaskRowActions| DiscoverUI
    Delete -->|TaskRowActions| DiscoverUI
    Settings -->|AppNavigation, AppContent, SettingsPanel| DiscoverUI

    Render --> HeaderSlot
    Render --> NavigationSlot
    Render --> ContentSlot
    Render --> AssistantSlot
    Render --> ComposerSlot
    Render --> RowActionsSlot
    Render --> SettingsSlot

    classDef contribution fill:#322a67,stroke:#9c8cff,color:#ffffff;
    classDef registry fill:#172735,stroke:#63d9ff,color:#ffffff;
    classDef slot fill:#123443,stroke:#63d9ff,color:#ffffff,stroke-dasharray:5 5;

    class Planner,Composer,Status,Delete,Settings contribution;
    class DiscoverUI,TypeCheck,Order,Render registry;
    class HeaderSlot,NavigationSlot,ContentSlot,AssistantSlot,ComposerSlot,RowActionsSlot,SettingsSlot slot;
```

### UI-slot benefits

- **Stable shell:** global layout does not need to know which product features exist.
- **Independent feature UI:** each feature owns its view, interaction, and local state.
- **Typed extension points:** each slot exposes the smallest model needed by its contributors.
- **Deterministic composition:** contribution order comes from metadata rather than import order.
- **Easy replacement:** a contribution can be removed or replaced without redesigning the shell.
- **Parallel development:** teams and AI agents work in separate feature folders with fewer merge conflicts.
- **Focused UI testing:** contributions can be tested against their slot model independently.

## 4. Anatomy of one feature module

Backend behavior, frontend contribution, executable registration, contracts, and implementation guidance remain colocated.

```mermaid
flowchart TB
    FeatureFolder[Feature folder]

    FeatureFolder --> Definition[feature.definition.json]
    FeatureFolder --> Manifest[manifest.ts]
    FeatureFolder --> Contracts[contracts]
    FeatureFolder --> Backend[backend]
    FeatureFolder --> Frontend[frontend]
    FeatureFolder --> Plan[IMPLEMENTATION_PLAN.md]

    Contracts --> Input[input.schema.json]
    Contracts --> Output[output.schema.json]

    Backend --> Behavior[feature.ts]
    Backend --> BackendTests[feature tests]

    Frontend --> Contribution[contribution.tsx]
    Frontend --> FrontendTests[UI tests]

    Definition -. declares .-> Manifest
    Input -. validates .-> Behavior
    Behavior -. returns .-> Output
    Manifest -. registers .-> Behavior
    Manifest -. registers .-> Contribution

    classDef root fill:#322a67,stroke:#9c8cff,color:#ffffff,stroke-width:2px;
    classDef contract fill:#17362f,stroke:#5ce0b6,color:#ffffff;
    classDef implementation fill:#172735,stroke:#63d9ff,color:#ffffff;
    classDef metadata fill:#282442,stroke:#9c8cff,color:#ffffff;

    class FeatureFolder root;
    class Contracts,Input,Output contract;
    class Backend,Behavior,BackendTests,Frontend,Contribution,FrontendTests implementation;
    class Definition,Manifest,Plan metadata;
```

## 5. Same feature across browser and AI clients

Browser actions and AI tool calls must not create separate business-logic paths.

```mermaid
sequenceDiagram
    autonumber
    actor Person
    participant UI as Feature UI
    participant HTTP as HTTP adapter
    actor Agent as AI client
    participant MCP as MCP adapter
    participant Runtime as AIFA runtime
    participant Feature as Atomic feature
    participant Capability as Bound capabilities
    participant Data as Database, audit, outbox

    alt Browser invocation
        Person->>UI: Submit feature action
        UI->>HTTP: Contract input
        HTTP->>Runtime: Actor + input + metadata
    else AI invocation
        Agent->>MCP: Invoke typed tool
        MCP->>Runtime: Actor + input + metadata
    end

    Runtime->>Runtime: Validate contract and policy
    Runtime->>Feature: Execute with declared capabilities
    Feature->>Capability: Request governed operation
    Capability->>Data: Tenant-bound transaction
    Data-->>Capability: Persisted result
    Capability-->>Feature: Domain result
    Feature-->>Runtime: Typed feature result
    Runtime-->>HTTP: Validated output
    Runtime-->>MCP: Validated output
```

### Cross-channel benefits

- Business behavior exists once.
- Browser and AI clients receive the same validation and error semantics.
- AI tools cannot bypass authorization, tenancy, confirmation, or auditing.
- New transports can be added as adapters without duplicating feature logic.
- Contract parity can be verified automatically in tests.

## 6. Why AIFA is AI-friendly

```mermaid
mindmap
  root((AI-friendly architecture))
    Local context
      One feature folder
      Explicit business need
      Focused implementation plan
    Machine-readable boundaries
      JSON Schema contracts
      Declared capabilities
      Declared dependencies
      Declared slots and events
    Safer automated changes
      Architecture validation
      Import rules
      Runtime capability checks
      Contract tests
    Parallel delivery
      Fewer shared files
      Smaller review surface
      Independent tests
      Reduced merge conflicts
    Explainable composition
      Dynamic discovery
      Same HTTP and MCP behavior
      Typed UI slots
      Versioned public contracts
```

## 7. Summary of benefits

| Benefit | Architectural mechanism | Practical result |
|---|---|---|
| Easy extension | Feature-local manifests and discovery | Add a feature without editing central product registries |
| Low coupling | Capability injection and bounded contexts | Change infrastructure without changing business behavior |
| Frontend composability | Named, typed UI slots | Add feature UI without rewriting the app shell |
| Independent testing | Small feature contexts and capability fakes | Fast, focused behavioral tests |
| Cross-channel consistency | Shared AIFA invocation for HTTP and MCP | Browser and AI clients follow the same rules |
| Safer AI development | Machine-readable definitions and contracts | Agents can reason locally with fewer hidden assumptions |
| Parallel work | Colocated feature slices | Fewer shared-file edits and merge conflicts |
| Replaceable adapters | Runtime-owned infrastructure | Swap data, AI, identity, or transport implementations |
| Strong governance | Validation, scopes, tenancy, audit, and events | Extension does not weaken platform safety |
| Long-term evolvability | Versioned contracts and explicit dependencies | Contexts can change without implementation coupling |

## Required guardrails

AIFA provides these benefits only when its boundaries are executable:

1. Validate input, output, provider responses, and events at runtime.
2. Bind actor and tenant inside infrastructure capabilities.
3. Grant only the capabilities declared by the feature.
4. Enforce dependency rules in CI.
5. Type every UI slot through a slot-to-model map.
6. Check feature definitions against executable manifests and contributions.
7. Test HTTP and MCP parity.
8. Keep audit, outbox, business persistence, and idempotency transactionally reliable.

