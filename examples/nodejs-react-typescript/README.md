# AIFA React + Node Slot App

This is a full-stack example app for **AI Atomic Feature Architecture**.

It includes:

- Node.js backend
- TypeScript React frontend
- AIFA atomic backend features
- file-backed persistence
- behavioral tests

## Why Slots?

Named slots as extension points. A slot is placed in the UI, and independent contributions can render content into that slot with an order and a model.

This example borrows the concept for React:

```jsx
<Slot name="TASK_ACTIONS" model={{ task, onComplete, onDelete }} />
```

Then another module contributes UI:

```jsx
registerSlotContribution({
  slot: "TASK_ACTIONS",
  name: "complete-task-action",
  order: 10,
  render: ({ model }) => <button onClick={() => model.onComplete(model.task)}>Complete</button>,
});
```

This keeps the frontend extensible in the same spirit as AIFA:

- backend features are atomic
- frontend UI areas are explicit extension points
- contributions are small, ordered, and isolated

## Run

Install dependencies once:

```sh
npm install
```

Start the API:

```sh
npm run api
```

Start the React app in another terminal:

```sh
npm run dev
```

The frontend is type-checked as part of `npm run build`.

Open:

```txt
http://127.0.0.1:5173
```

## Test

```sh
npm test
```

## Architecture

```txt
React UI
  |
  | renders Slot(name, model)
  v
Slot Registry
  |
  | ordered UI contributions
  v
Task Board UI

HTTP API
  |
  | runs one feature per route
  v
AIFA Runtime
  |
  | exposes declared capabilities
  v
File-backed storage
```

## Atomic Backend Features

| Feature | Route | Purpose |
| --- | --- | --- |
| `create-task` | `POST /api/tasks` | Create one task |
| `list-tasks` | `GET /api/tasks` | List tasks |
| `complete-task` | `POST /api/tasks/:id/complete` | Complete one task |
| `reopen-task` | `POST /api/tasks/:id/reopen` | Reopen one task |
| `delete-task` | `DELETE /api/tasks/:id` | Delete one task |

## Frontend Slots

| Slot | Model | Purpose |
| --- | --- | --- |
| `APP_HEADER_ACTIONS` | `{ tasks, refreshTasks }` | Add header-level actions |
| `TASK_SUMMARY_CARDS` | `{ tasks }` | Add dashboard summary cards |
| `TASK_ACTIONS` | `{ task, completeTask, reopenTask, deleteTask }` | Add row-level task actions |
| `EMPTY_STATE_ACTIONS` | `{ createExampleTask }` | Add empty state actions |
