import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { completeTask } from "./features/completeTask.js";
import { createTask } from "./features/createTask.js";
import { deleteTask } from "./features/deleteTask.js";
import { listTasks } from "./features/listTasks.js";
import { reopenTask } from "./features/reopenTask.js";
import { createAifaRuntime } from "./runtime/aifaRuntime.js";
import { createFileTaskStore } from "./storage/fileTaskStore.js";

const rootDir = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const frontendDir = join(rootDir, "frontend");
const dataPath = join(rootDir, "data", "tasks.json");

const runtime = createAifaRuntime({
  taskStore: createFileTaskStore(dataPath),
});

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    await serveStatic(response, url.pathname);
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: {
        code: "server_error",
        message: error.message,
      },
    });
  }
});

async function handleApi(request, response, url) {
  const actor = {
    id: request.headers["x-demo-user"] ?? "demo-user",
  };

  if (request.method === "GET" && url.pathname === "/api/tasks") {
    sendFeatureResult(response, await runtime.run(listTasks, {}, actor));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/tasks") {
    const body = await readJson(request);
    sendFeatureResult(response, await runtime.run(createTask, { title: body.title }, actor), 201);
    return;
  }

  const taskActionMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/(complete|reopen)$/);

  if (request.method === "POST" && taskActionMatch) {
    const [, taskId, action] = taskActionMatch;
    const feature = action === "complete" ? completeTask : reopenTask;
    sendFeatureResult(response, await runtime.run(feature, { taskId }, actor));
    return;
  }

  const taskDeleteMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);

  if (request.method === "DELETE" && taskDeleteMatch) {
    const [, taskId] = taskDeleteMatch;
    sendFeatureResult(response, await runtime.run(deleteTask, { taskId }, actor));
    return;
  }

  sendJson(response, 404, {
    ok: false,
    error: {
      code: "route_not_found",
      message: "API route was not found",
    },
  });
}

async function serveStatic(response, pathname) {
  const requestedFile = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = join(frontendDir, requestedFile);
  const content = await readFile(filePath);
  const type = contentTypes[extname(filePath)] ?? "application/octet-stream";

  response.writeHead(200, { "content-type": type });
  response.end(content);
}

async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendFeatureResult(response, result, successStatus = 200) {
  if (result.ok) {
    sendJson(response, successStatus, result);
    return;
  }

  const status = result.error.code === "not_found" ? 404 : 400;
  sendJson(response, status, result);
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

server.listen(port, host, () => {
  console.log(`AIFA Task Board running at http://${host}:${port}`);
});
