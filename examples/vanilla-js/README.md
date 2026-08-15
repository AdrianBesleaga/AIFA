# AIFA Full-Stack Task Board

This is a fully functional example app built with **AI Atomic Feature Architecture**.

It has:

- a Node.js backend
- a browser frontend
- file-backed persistence
- atomic backend features
- runtime-provided capabilities
- ticket contracts
- behavioral tests

## Run

```sh
npm test
npm start
```

Open:

```txt
http://localhost:3000
```

## Architecture

Each app action maps to one AIFA feature:

| UI Action | API Route | Atomic Feature |
| --- | --- | --- |
| Create task | `POST /api/tasks` | `createTask` |
| List tasks | `GET /api/tasks` | `listTasks` |
| Complete task | `POST /api/tasks/:id/complete` | `completeTask` |
| Reopen task | `POST /api/tasks/:id/reopen` | `reopenTask` |
| Delete task | `DELETE /api/tasks/:id` | `deleteTask` |

The feature does not know HTTP, files, local storage, routing, or the frontend.

The feature only knows:

- its input
- its output
- its allowed capabilities
- its business rules

## Folder Structure

```txt
backend/
  features/       Atomic features
  runtime/        AIFA runtime and HTTP adapter
  storage/        File-backed task store
  server.js       Backend entrypoint
frontend/
  index.html      Browser UI
  styles.css      UI styling
  app.js          Frontend behavior
examples/tickets/
  *.md            Human/AI-readable ticket contracts
test/
  *.test.js       Behavioral feature tests
```

## Why This Example Matters

Without AIFA, "add task completion" could require exploring routes, controllers, services, storage, frontend state, and tests.

With AIFA, the implementation target is small:

1. read the ticket
2. implement one feature
3. use only declared capabilities
4. run behavioral tests

The runtime owns infrastructure. The feature owns behavior.

