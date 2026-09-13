#!/usr/bin/env node
/**
 * Nitro's Vercel bundle inlines @electric-sql/pglite JS but not pglite.data /
 * pglite.wasm. Without them, production (no DATABASE_URL) crashes with ENOENT.
 *
 * legal-seed.json and extra jsonl.gz corpora are read at runtime (not bundled)
 * so they do not OOM the SSR build. Copy them next to the serverless function.
 */
import { copyFile, mkdir, readdir } from "node:fs/promises";
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

const dataFrom = join(root, "src/data");
const dataTo = join(funcDir, "src/data");
await mkdir(dataTo, { recursive: true });
await copyFile(join(dataFrom, "legal-seed.json"), join(dataTo, "legal-seed.json"));
console.log("[legal-seed]", "copied into serverless function");

const extraRe = /^(moshir-iran-corpus-part\d+|power-cases-full|moshir-pilot)\.jsonl\.gz$/;
const extraNames = (await readdir(dataFrom)).filter((f) => extraRe.test(f));
for (const name of extraNames) {
  await copyFile(join(dataFrom, name), join(dataTo, name));
  console.log("[extra-corpus]", name, "copied into serverless function");
}
