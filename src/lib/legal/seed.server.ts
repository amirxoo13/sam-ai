import { existsSync, readdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { getSql } from "@/lib/db";
import { anonymizeChunk } from "./anonymize";
import type { LegalChunk } from "./types";

let seeding: Promise<void> | null = null;
let seedFilePromise: Promise<SeedFile> | null = null;

type SeedFile = {
  model: string;
  dim: number;
  chunks: LegalChunk[];
};

type ExtraChunk = {
  id: string;
  content: string;
  source_type: string;
  source_title: string | null;
  article_number: string | null;
  law_date: string | null;
  source_url: string | null;
  source_id: string | null;
  hf_dataset: string | null;
};

const INSERT_BATCH = 80;
const EXTRA_DATASETS = [
  "amirxo13/iran-legal-corpus",
  "power-edaalat-index",
  "moshir-legal-rag-pilot",
] as const;

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

function extraCorpusDir(): string {
  const cwd = process.cwd();
  for (const dir of [join(cwd, "src/data"), join(cwd, "data")]) {
    if (existsSync(dir)) return dir;
  }
  return join(cwd, "src/data");
}

function extraCorpusFiles(): string[] {
  const dir = extraCorpusDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) =>
      /^(moshir-iran-corpus-part\d+|power-cases-full|moshir-pilot)\.jsonl\.gz$/.test(
        f,
      ),
    )
    .sort()
    .map((f) => join(dir, f));
}

function loadExtraChunks(): ExtraChunk[] {
  const out: ExtraChunk[] = [];
  for (const path of extraCorpusFiles()) {
    const text = gunzipSync(readFileSync(path)).toString("utf8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      const parsed = JSON.parse(line) as ExtraChunk;
      out.push(anonymizeChunk(parsed));
    }
  }
  return out;
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

async function insertOriginalSlice(
  sql: Awaited<ReturnType<typeof getSql>>,
  slice: LegalChunk[],
  hasVec: boolean,
) {
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
    return;
  }
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

async function insertExtraSlice(
  sql: Awaited<ReturnType<typeof getSql>>,
  slice: ExtraChunk[],
) {
  const values: unknown[] = [];
  const rows = slice.map((chunk, idx) => {
    const b = idx * 10;
    values.push(
      chunk.id,
      chunk.content,
      "[]",
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
     on conflict (id) do update set
       content = excluded.content,
       source_type = excluded.source_type,
       source_title = excluded.source_title,
       article_number = excluded.article_number,
       law_date = excluded.law_date,
       source_url = excluded.source_url,
       source_id = excluded.source_id,
       hf_dataset = excluded.hf_dataset`,
    values,
  );
}

async function seedOriginal() {
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
    await insertOriginalSlice(
      sql,
      seedFile.chunks.slice(i, i + INSERT_BATCH),
      hasVec,
    );
  }
}

async function seedExtra() {
  const files = extraCorpusFiles();
  if (files.length === 0) return;
  const extra = loadExtraChunks();
  if (extra.length === 0) return;
  const sql = await getSql();
  const existing = await sql.query<{ n: number }>(
    `select count(*)::int as n from legal_chunks
     where hf_dataset = any($1::text[])`,
    [EXTRA_DATASETS],
  );
  if ((existing[0]?.n ?? 0) >= extra.length) return;
  for (let i = 0; i < extra.length; i += INSERT_BATCH) {
    await insertExtraSlice(sql, extra.slice(i, i + INSERT_BATCH));
  }
}

async function seedOnce() {
  await seedOriginal();
  await seedExtra();
}

export function ensureSeeded(): Promise<void> {
  seeding ??= seedOnce().catch((err) => {
    seeding = null;
    throw err;
  });
  return seeding;
}
