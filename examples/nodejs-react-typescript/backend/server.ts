import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { completeTask } from "./features/completeTask";
import { createTask } from "./features/createTask";
import { deleteTask } from "./features/deleteTask";
import { listTasks } from "./features/listTasks";
import { reopenTask } from "./features/reopenTask";
import { createAifaRuntime } from "./runtime/aifaRuntime";
import { createFileTaskStore } from "./storage/fileTaskStore";
import type { FeatureResult } from "./runtime/feature";

const rootDir = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const dataPath = join(rootDir, "data", "tasks.json");
const distDir = join(rootDir, "dist");
const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};
const runtime = createAifaRuntime({ taskStore: createFileTaskStore(dataPath) });

const server = createServer(async (request, response) => {
  try {
    writeCorsHeaders(response);
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }
    await serveStatic(response, url.pathname);
  } catch (error: unknown) {
    sendJson(response, 500, {
      ok: false,
      error: {
        code: "server_error",
        message: error instanceof Error ? error.message : "Unexpected server error",
      },
    });
  }
});

async function handleApi(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
): Promise<void> {
  const demoUser = request.headers["x-demo-user"];
  const actor = { id: typeof demoUser === "string" ? demoUser : "demo-user" };
  if (request.method === "GET" && url.pathname === "/api/tasks") {
    sendFeatureResult(response, await runtime.run(listTasks, {}, actor));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/tasks") {
    sendFeatureResult(response, await runtime.run(createTask, await readJson(request), actor), 201);
    return;
  }
  const actionMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/(complete|reopen)$/);
  if (request.method === "POST" && actionMatch) {
    const [, taskId, action] = actionMatch;
    sendFeatureResult(
      response,
      action === "complete"
        ? await runtime.run(completeTask, { taskId }, actor)
        : await runtime.run(reopenTask, { taskId }, actor),
    );
    return;
  }
  const deleteMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (request.method === "DELETE" && deleteMatch) {
    sendFeatureResult(response, await runtime.run(deleteTask, { taskId: deleteMatch[1] }, actor));
    return;
  }
  sendJson(response, 404, {
    ok: false,
    error: { code: "route_not_found", message: "API route was not found" },
  });
}

async function serveStatic(response: ServerResponse, pathname: string): Promise<void> {
  const requestedFile = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = join(distDir, requestedFile);
  response.writeHead(200, {
    "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream",
  });
  response.end(await readFile(filePath));
}

async function readJson(request: IncomingMessage): Promise<{ title?: string; priority?: string }> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return chunks.length === 0
    ? {}
    : (JSON.parse(Buffer.concat(chunks).toString("utf8")) as { title?: string; priority?: string });
}

function sendFeatureResult<Value>(
  response: ServerResponse,
  result: FeatureResult<Value>,
  successStatus = 200,
): void {
  sendJson(
    response,
    result.ok ? successStatus : result.error.code === "not_found" ? 404 : 400,
    result,
  );
}
function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}
function writeCorsHeaders(response: ServerResponse): void {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,DELETE,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type,x-demo-user");
}

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
server.listen(port, host, () =>
  console.log(`AIFA React Slot App running at http://${host}:${port}`),
);
