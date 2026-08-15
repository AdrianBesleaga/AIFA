import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 32_000 + Math.floor(Math.random() * 1_000);
const child = spawn(process.execPath, ["dist/server/core/backend/server.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: "development",
    HOST: "127.0.0.1",
    PORT: String(port),
    PUBLIC_BASE_URL: `http://127.0.0.1:${port}`,
    MONGODB_DATABASE: `built_server_smoke_${process.pid}`,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
child.stdout.on("data", (chunk) => (output += chunk));
child.stderr.on("data", (chunk) => (output += chunk));

try {
  const deadline = Date.now() + 45_000;
  let response;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Built server exited early (${child.exitCode})\n${output}`);
    try {
      response = await fetch(`http://127.0.0.1:${port}/health/ready`);
      if (response.ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.equal(response?.status, 200, `Built server did not become ready\n${output}`);
  const readiness = await response.json();
  assert.equal(readiness.status, "ready");
  assert.equal(readiness.checks.mongo, "ok");
  console.log("Built server smoke test passed.");
} finally {
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 10_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
