import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureRoot = await mkdtemp(join(tmpdir(), "aifa-import-boundary-"));
try {
  await Promise.all([
    mkdir(join(fixtureRoot, "contexts/example/features/bad"), { recursive: true }),
    mkdir(join(fixtureRoot, "core/backend"), { recursive: true }),
    mkdir(join(fixtureRoot, "node_modules/mongodb"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      join(fixtureRoot, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          target: "ES2022",
        },
      }),
    ),
    writeFile(join(fixtureRoot, "core/backend/config.ts"), "export const secret = 'runtime';\n"),
    writeFile(
      join(fixtureRoot, "node_modules/mongodb/package.json"),
      JSON.stringify({ name: "mongodb", version: "0.0.0", type: "module", exports: "./index.js" }),
    ),
    writeFile(
      join(fixtureRoot, "node_modules/mongodb/index.js"),
      "export class MongoClient {}\n",
    ),
    writeFile(
      join(fixtureRoot, "contexts/example/features/bad/feature.ts"),
      [
        'import { secret } from "../../../../core/backend/config.js";',
        'import { readFile } from "node:fs/promises";',
        'import { MongoClient } from "mongodb";',
        "void secret;",
        "void readFile;",
        "void MongoClient;",
      ].join("\n"),
    ),
  ]);
  const result = spawnSync(
    join(appRoot, "node_modules/.bin/depcruise"),
    [
      "--config",
      join(appRoot, "core/architecture/.dependency-cruiser.cjs"),
      "--output-type",
      "json",
      "contexts",
      "core",
    ],
    { cwd: fixtureRoot, encoding: "utf8" },
  );
  const report = JSON.parse(result.stdout || "{}");
  const rules = new Set(
    (report.summary?.violations ?? []).map((violation) => violation.rule?.name),
  );
  for (const expected of [
    "product-code-cannot-import-core-backend",
    "features-cannot-import-node-runtime",
    "features-cannot-import-infrastructure-packages",
  ]) {
    if (!rules.has(expected))
      throw new Error(
        `Dependency boundary fixture did not trigger '${expected}': ${JSON.stringify(report.summary?.violations ?? report.modules ?? [])}`,
      );
  }
  console.log("Dependency boundary violation fixtures were rejected.");
} finally {
  await rm(fixtureRoot, { recursive: true, force: true });
}
