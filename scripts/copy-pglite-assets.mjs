#!/usr/bin/env node
/**
 * Nitro's Vercel bundle inlines @electric-sql/pglite JS but not pglite.data /
 * pglite.wasm. Without them, production (no DATABASE_URL) crashes with ENOENT.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcDir = join(root, "node_modules/@electric-sql/pglite/dist");
const destDir = join(root, ".vercel/output/functions/__server.func/_libs");

const files = ["pglite.data", "pglite.wasm", "initdb.wasm"];

await mkdir(destDir, { recursive: true });
for (const name of files) {
  const from = join(srcDir, name);
  const to = join(destDir, name);
  await copyFile(from, to);
  console.log("[pglite-assets]", name, "->", to);
}
