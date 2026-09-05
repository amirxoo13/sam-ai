#!/usr/bin/env node
/**
 * Nitro's Vercel bundle inlines @electric-sql/pglite JS but not pglite.data /
 * pglite.wasm. Without them, production (no DATABASE_URL) crashes with ENOENT.
 *
 * legal-seed.json is read at runtime (not bundled) so the 37MB embedding file
 * does not OOM the SSR build. Copy it next to the serverless function.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcDir = join(root, "node_modules/@electric-sql/pglite/dist");
const destDir = join(root, ".vercel/output/functions/__server.func/_libs");
const funcDir = join(root, ".vercel/output/functions/__server.func");

const files = ["pglite.data", "pglite.wasm", "initdb.wasm"];

await mkdir(destDir, { recursive: true });
for (const name of files) {
  const from = join(srcDir, name);
  const to = join(destDir, name);
  await copyFile(from, to);
  console.log("[pglite-assets]", name, "->", to);
}

const seedFrom = join(root, "src/data/legal-seed.json");
await mkdir(join(funcDir, "src/data"), { recursive: true });
await copyFile(seedFrom, join(funcDir, "src/data/legal-seed.json"));
console.log("[legal-seed]", "copied into serverless function");
