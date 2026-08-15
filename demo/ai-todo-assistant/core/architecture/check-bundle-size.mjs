import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const assets = join(process.cwd(), "dist/web/assets");
const files = (await readdir(assets)).filter((file) => file.endsWith(".js"));
const sizes = await Promise.all(files.map(async (file) => ({ file, bytes: (await stat(join(assets, file))).size })));
const largest = sizes.sort((left, right) => right.bytes - left.bytes)[0];
const total = sizes.reduce((sum, entry) => sum + entry.bytes, 0);
if (!largest) throw new Error("No JavaScript bundle artifacts were found");
if (largest.bytes > 400_000)
  throw new Error(`Largest JavaScript chunk ${largest.file} is ${largest.bytes} bytes; budget is 400000`);
if (total > 600_000)
  throw new Error(`Total JavaScript is ${total} bytes; budget is 600000`);
console.log(`Bundle budget passed: largest=${largest.bytes} bytes, total=${total} bytes.`);
