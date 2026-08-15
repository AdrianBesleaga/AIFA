import assert from "node:assert/strict";
import test from "node:test";
import React, { type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient } from "../core/frontend/query/query-client.js";
import { QueryClientProvider } from "../core/frontend/query/react-query.js";
import { contribution as createTask } from "../contexts/task-management/features/create-task/frontend/contribution.js";
import { contribution as deleteTask } from "../contexts/task-management/features/delete-task/frontend/contribution.js";
import { TaskCategory, TaskPriority, TaskStatus } from "../contexts/task-management/contracts/v1/task-taxonomy.js";

function withFrontendRuntime(children: ReactNode) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

test("task composer exposes names for every interactive field", () => {
  const markup = renderToStaticMarkup(withFrontendRuntime(createTask.render({})));
  assert.match(markup, /aria-label="Task title"/);
  assert.match(markup, /aria-label="Task category"/);
  assert.match(markup, /aria-label="Task priority"/);
  assert.match(markup, />Add task</);
});

test("destructive task action has a task-specific accessible name", () => {
  const markup = renderToStaticMarkup(
    withFrontendRuntime(
      deleteTask.render({
        task: {
          id: "task-1",
          title: "Release checklist",
          category: TaskCategory.Work,
          priority: TaskPriority.High,
          status: TaskStatus.Todo,
          version: 1,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          completedAt: null,
        },
      }),
    ),
  );
  assert.match(markup, /aria-label="delete Release checklist"/);
});
