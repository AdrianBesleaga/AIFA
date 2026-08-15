import { mkdir, readdir, copyFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourceRoot = join(appRoot, "contexts");
const outputRoot = join(appRoot, "dist/server/contexts");

async function copyJson(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const source = join(directory, entry.name);
    if (entry.isDirectory()) await copyJson(source);
    else if (entry.name.endsWith(".json")) {
      const destination = join(outputRoot, relative(sourceRoot, source));
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(source, destination);
    }
  }
}

await copyJson(sourceRoot);
