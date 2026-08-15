import assert from "node:assert/strict";
import test from "node:test";
import { createOllamaTaskPlanner } from "../contexts/ai-planning/infrastructure/ollama-task-planner.js";
import { TaskCategory, TaskPriority } from "../contexts/task-management/contracts/v1/task-taxonomy.js";

const input = { goal: "Ship safely", category: TaskCategory.Work, priority: TaskPriority.High };
const validSuggestions = [
  {
    title: "Review release checklist",
    category: TaskCategory.Work,
    priority: TaskPriority.High,
    rationale: "Catch issues before release",
  },
];
const success = () =>
  new Response(JSON.stringify({ response: JSON.stringify(validSuggestions) }), { status: 200 });

test("Ollama planner retries transient failures and records successful provenance", async () => {
  let calls = 0;
  const planner = createOllamaTaskPlanner("http://ollama.test", "test-model", {
    fetch: async () => (++calls === 1 ? new Response("unavailable", { status: 503 }) : success()),
  });
  const result = await planner(input);
  assert.equal(result.ok, true);
  assert.equal(calls, 2);
  if (result.ok) assert.equal(result.provenance.model, "test-model");
  assert.deepEqual(planner.health(), {
    requests: 1,
    successes: 1,
    failures: 0,
    rejected: 0,
    active: 0,
    lastLatencyMs: planner.health().lastLatencyMs,
  });
});

test("Ollama planner rejects invalid contract output and opens its circuit", async () => {
  let calls = 0;
  const planner = createOllamaTaskPlanner("http://ollama.test", "test-model", {
    now: () => 1_000,
    fetch: async () => {
      calls++;
      return new Response(JSON.stringify({ response: JSON.stringify([{ title: "Incomplete" }]) }));
    },
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await planner(input);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "AssistantResponseInvalid");
  }
  const rejected = await planner(input);
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.match(rejected.message, /circuit is open/);
  assert.equal(calls, 3);
  assert.equal(planner.health().rejected, 1);
  assert.equal(planner.health().active, 0);
});

test("Ollama planner caps concurrent and per-minute requests", async () => {
  const resolvers: Array<(response: Response) => void> = [];
  const concurrentPlanner = createOllamaTaskPlanner("http://ollama.test", "test-model", {
    fetch: () => new Promise<Response>((resolve) => resolvers.push(resolve)),
  });
  const active = Array.from({ length: 4 }, () => concurrentPlanner(input));
  const overflow = await concurrentPlanner(input);
  assert.equal(overflow.ok, false);
  resolvers.forEach((resolve) => resolve(success()));
  await Promise.all(active);
  assert.equal(concurrentPlanner.health().rejected, 1);
  assert.equal(concurrentPlanner.health().active, 0);

  const ratePlanner = createOllamaTaskPlanner("http://ollama.test", "test-model", {
    now: () => 5_000,
    fetch: async () => success(),
  });
  for (let request = 0; request < 30; request++) assert.equal((await ratePlanner(input)).ok, true);
  assert.equal((await ratePlanner(input)).ok, false);
  assert.equal(ratePlanner.health().rejected, 1);
});
