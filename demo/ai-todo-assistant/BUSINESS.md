# AI Todo Assistant: Business Goal

## The Product

AI Todo Assistant is a personal task-management product for people who know what they want to accomplish but do not want to spend time translating every intention into a structured todo list.

Users organize their life by the initial system categories Work, Personal, Sport, Shopping, and Other. Instead of manually writing, prioritizing, and updating every task, a user can describe an outcome in natural language:

> “Prepare everything for my half marathon next month.”

The assistant turns that goal into useful, categorized tasks with priorities. It can also update ticket status as work progresses.

## Business Problem

Traditional todo apps make users do all administrative work: break down goals, decide categories, create tickets, set priorities, and keep statuses current. This friction means plans are incomplete or lists become stale.

AI Todo Assistant reduces that overhead while preserving user control. The AI proposes work; the user reviews, accepts, changes, or deletes it. Every change is visible as an ordinary task operation, not an opaque AI side effect.

## Product Goals

- Convert natural-language goals into practical task plans.
- Organize tasks using `TaskCategory` values such as Work, Personal, Sport, Shopping, and Other.
- Track task state with explicit `TaskStatus` values such as Todo, InProgress, and Completed.
- Let AI assistants create tasks and move task status through the same governed product operations available to a human.
- Allow users to connect their preferred AI client through an MCP server, including locally hosted Ollama models.
- Keep sensitive task data under the user’s chosen deployment and model-provider configuration.

Custom tenant-defined categories are deliberately out of scope for the first release: they cannot safely be represented by a closed enum. A future Category Management bounded context will introduce a tenant-owned `Category` entity while retaining enum-backed category lifecycle states.

## AI and MCP Model

The application exposes an MCP server. Any MCP-compatible AI client can discover the app’s tools and operate on the user’s task list within the same AIFA contracts, validation, audit trail, and capability boundaries as the web UI.

The app also supports Ollama as a locally configured model provider for task-plan generation. Cloud model providers may be added behind the same provider-neutral capability. No feature imports a provider SDK directly.

Examples of MCP operations:

- create a categorized task;
- list or filter tasks;
- propose a task plan from a natural-language goal;
- move a task to Todo, InProgress, or Completed;
- delete a task when the user explicitly requests it.

## Trust Principles

- AI suggestions are reviewable before becoming tasks.
- Status changes are explicit, validated, and audited.
- The same API and feature rules apply whether work originates in the browser, an MCP client, or a local Ollama-assisted workflow.
- Users retain control over categories, priorities, task state, and their selected AI provider.
