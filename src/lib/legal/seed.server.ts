import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getSql } from "@/lib/db";
import type { LegalChunk } from "./types";

let seeding: Promise<void> | null = null;
let seedFilePromise: Promise<SeedFile> | null = null;

type SeedFile = {
  model: string;
  dim: number;
  chunks: LegalChunk[];
};

const INSERT_BATCH = 50;

function resolveSeedPath(): string {
  const cwd = process.cwd();
  const candidates = [
    join(cwd, "src/data/legal-seed.json"),
    join(cwd, "legal-seed.json"),
    join(cwd, "data/legal-seed.json"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  throw new Error("فایل پیکره حقوقی پیدا نشد");
}

async function loadSeedFile(): Promise<SeedFile> {
  seedFilePromise ??= readFile(resolveSeedPath(), "utf8").then((raw) => {
    const parsed = JSON.parse(raw) as SeedFile;
    if (!Array.isArray(parsed.chunks)) {
      throw new Error("ساختار پیکره حقوقی نامعتبر است");
    }
    return parsed;
  });
  return seedFilePromise;
}

async function seedOnce() {
  const seedFile = await loadSeedFile();
  const sql = await getSql();
  const existing = await sql.query<{ n: number }>(
    "select count(*)::int as n from legal_chunks",
  );
  if ((existing[0]?.n ?? 0) >= seedFile.chunks.length) return;

  let hasVec = false;
  try {
    await sql.query("create extension if not exists vector");
    await sql.query(
      "alter table legal_chunks add column if not exists embedding_vec vector(384)",
    );
    hasVec = true;
  } catch {
    hasVec = false;
  }

  for (let i = 0; i < seedFile.chunks.length; i += INSERT_BATCH) {
    const slice = seedFile.chunks.slice(i, i + INSERT_BATCH);
    if (hasVec) {
      const values: unknown[] = [];
      const rows = slice.map((chunk, idx) => {
        const b = idx * 11;
        values.push(
          chunk.id,
          chunk.content,
          JSON.stringify(chunk.embedding),
          `[${chunk.embedding.join(",")}]`,
          chunk.source_type,
          chunk.source_title,
          chunk.article_number,
          chunk.law_date,
          chunk.source_url,
          chunk.source_id,
          chunk.hf_dataset,
        );
        return `($${b + 1},$${b + 2},$${b + 3}::jsonb,$${b + 4}::vector,$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11})`;
      });
      await sql.query(
        `insert into legal_chunks
          (id, content, embedding, embedding_vec, source_type, source_title, article_number, law_date, source_url, source_id, hf_dataset)
         values ${rows.join(",")}
         on conflict (id) do nothing`,
        values,
      );
    } else {
      const values: unknown[] = [];
      const rows = slice.map((chunk, idx) => {
        const b = idx * 10;
        values.push(
          chunk.id,
          chunk.content,
          JSON.stringify(chunk.embedding),
          chunk.source_type,
          chunk.source_title,
          chunk.article_number,
          chunk.law_date,
          chunk.source_url,
          chunk.source_id,
          chunk.hf_dataset,
        );
        return `($${b + 1},$${b + 2},$${b + 3}::jsonb,$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10})`;
      });
      await sql.query(
        `insert into legal_chunks
          (id, content, embedding, source_type, source_title, article_number, law_date, source_url, source_id, hf_dataset)
         values ${rows.join(",")}
         on conflict (id) do nothing`,
        values,
      );
    }
  }
}

export function ensureSeeded(): Promise<void> {
  seeding ??= seedOnce().catch((err) => {
    seeding = null;
    throw err;
  });
  return seeding;
}
