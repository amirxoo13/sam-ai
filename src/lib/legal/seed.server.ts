import { existsSync, readdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { getSql } from "@/lib/db";
import { anonymizeChunk } from "./anonymize";
import { parseArticleRefs } from "./article-query";
import { uniqueById } from "./unique";
import type { LegalChunk } from "./types";

let originalSeeding: Promise<void> | null = null;
let extraSeeding: Promise<void> | null = null;
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
  embedding?: number[];
};

const INSERT_BATCH = 40;
const ORIGINAL_EMBEDDED_MIN = 12830;
/** Unique extra ids measured from the jsonl.gz files (overlapping moshir shards). */
const EXTRA_UNIQUE_TARGET = 63439;
const EXTRA_BUDGET_MS = 12_000;

const EXTRA_DATASETS = [
  "amirxo13/iran-legal-corpus",
  "power-edaalat-index",
  "moshir-legal-rag-pilot",
] as const;

function searchTextExpr(contentP: number, titleP: number, articleP: number): string {
  return `to_tsvector('simple', coalesce($${titleP}, '') || ' ' || coalesce($${articleP}, '') || ' ' || left($${contentP}, 40000))`;
}

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
      /^(moshir-iran-corpus-part\d+|power-cases-full|moshir-pilot)\.jsonl\.gz$/.test(f),
    )
    .sort()
    .map((f) => join(dir, f));
}

function inferArticleNumber(title: string | null, content: string, current: string | null): string | null {
  if (current && current.trim()) return current;
  const refs = parseArticleRefs(`${title ?? ""} ${content.slice(0, 500)}`);
  const hit = refs.find((r) => r.kind === "article" || r.kind === "principle");
  return hit?.number ?? null;
}

/** Postgres text columns reject the null byte (0x00). Corrupted source files
 * (e.g. mis-decoded Word docs) occasionally carry one — strip it instead of
 * letting the whole insert batch fail with "invalid byte sequence for
 * encoding UTF8: 0x00". */
function stripNullBytes<T>(value: T): T {
  return typeof value === "string" ? (value.replaceAll("\0", "") as unknown as T) : value;
}

function prepareExtra(parsed: ExtraChunk): ExtraChunk {
  const cleaned = anonymizeChunk(parsed);
  cleaned.article_number = inferArticleNumber(
    cleaned.source_title,
    cleaned.content,
    cleaned.article_number,
  );
  cleaned.content = stripNullBytes(cleaned.content);
  cleaned.source_title = stripNullBytes(cleaned.source_title);
  cleaned.article_number = stripNullBytes(cleaned.article_number);
  cleaned.law_date = stripNullBytes(cleaned.law_date);
  cleaned.source_url = stripNullBytes(cleaned.source_url);
  cleaned.source_id = stripNullBytes(cleaned.source_id);
  cleaned.hf_dataset = stripNullBytes(cleaned.hf_dataset);
  return cleaned;
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
  const unique = uniqueById(slice);
  if (unique.length === 0) return;
  if (hasVec) {
    const values: unknown[] = [];
    const rows = unique.map((chunk, idx) => {
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
      return `($${b + 1},$${b + 2},$${b + 3}::jsonb,$${b + 4}::vector,$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11},${searchTextExpr(b + 2, b + 6, b + 7)})`;
    });
    await sql.query(
      `insert into legal_chunks
        (id, content, embedding, embedding_vec, source_type, source_title, article_number, law_date, source_url, source_id, hf_dataset, search_text)
       values ${rows.join(",")}
       on conflict (id) do nothing`,
      values,
    );
    return;
  }
  const values: unknown[] = [];
  const rows = unique.map((chunk, idx) => {
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
    return `($${b + 1},$${b + 2},$${b + 3}::jsonb,$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},${searchTextExpr(b + 2, b + 5, b + 6)})`;
  });
  await sql.query(
    `insert into legal_chunks
      (id, content, embedding, source_type, source_title, article_number, law_date, source_url, source_id, hf_dataset, search_text)
     values ${rows.join(",")}
     on conflict (id) do nothing`,
    values,
  );
}

async function insertExtraPlain(sql: Awaited<ReturnType<typeof getSql>>, slice: ExtraChunk[]) {
  const unique = uniqueById(slice);
  if (unique.length === 0) return;
  const values: unknown[] = [];
  const rows = unique.map((chunk, idx) => {
    const embedding =
      Array.isArray(chunk.embedding) && chunk.embedding.length > 10 ? chunk.embedding : [];
    const b = idx * 10;
    values.push(
      chunk.id,
      chunk.content,
      JSON.stringify(embedding),
      chunk.source_type,
      chunk.source_title,
      chunk.article_number,
      chunk.law_date,
      chunk.source_url,
      chunk.source_id,
      chunk.hf_dataset,
    );
    return `($${b + 1},$${b + 2},$${b + 3}::jsonb,$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},${searchTextExpr(b + 2, b + 5, b + 6)})`;
  });
  await sql.query(
    `insert into legal_chunks
      (id, content, embedding, source_type, source_title, article_number, law_date, source_url, source_id, hf_dataset, search_text)
     values ${rows.join(",")}
     on conflict (id) do nothing`,
    values,
  );
}

async function seedOriginal() {
  const sql = await getSql();
  const existing = await sql.query<{ n: number }>(
    `select count(*)::int as n from legal_chunks
     where jsonb_typeof(embedding) = 'array' and jsonb_array_length(embedding) > 10
       and coalesce(hf_dataset, '') <> all($1::text[])`,
    [EXTRA_DATASETS],
  );
  if ((existing[0]?.n ?? 0) >= ORIGINAL_EMBEDDED_MIN) return;

  const seedFile = await loadSeedFile();
  let hasVec = false;
  try {
    await sql.query("create extension if not exists vector");
    await sql.query("alter table legal_chunks add column if not exists embedding_vec vector(384)");
    hasVec = true;
  } catch {
    hasVec = false;
  }

  const chunks = uniqueById(seedFile.chunks);
  for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
    await insertOriginalSlice(sql, chunks.slice(i, i + INSERT_BATCH), hasVec);
  }
}

async function seedExtra() {
  const files = extraCorpusFiles();
  if (files.length === 0) return;
  const sql = await getSql();
  const existing = await sql.query<{ n: number }>(
    `select count(*)::int as n from legal_chunks where hf_dataset = any($1::text[])`,
    [EXTRA_DATASETS],
  );
  if ((existing[0]?.n ?? 0) >= EXTRA_UNIQUE_TARGET) return;

  const already = await sql.query<{ id: string }>(
    `select id from legal_chunks where hf_dataset = any($1::text[])`,
    [EXTRA_DATASETS],
  );
  const seen = new Set(already.map((r) => r.id));
  const started = Date.now();
  let batch: ExtraChunk[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    await insertExtraPlain(sql, batch);
    batch = [];
  };

  for (const path of files) {
    if (Date.now() - started > EXTRA_BUDGET_MS) break;
    const text = gunzipSync(readFileSync(path)).toString("utf8");
    for (const line of text.split("\n")) {
      if (Date.now() - started > EXTRA_BUDGET_MS) break;
      if (!line.trim()) continue;
      let parsed: ExtraChunk;
      try {
        parsed = JSON.parse(line) as ExtraChunk;
      } catch {
        continue;
      }
      if (!parsed.id || seen.has(parsed.id)) continue;
      seen.add(parsed.id);
      batch.push(prepareExtra(parsed));
      if (batch.length >= INSERT_BATCH) await flush();
    }
  }
  await flush();
}

async function seedOriginalSafe() {
  try {
    await seedOriginal();
  } catch (err) {
    console.error("seedOriginal failed", err);
  }
}

async function seedExtraSafe() {
  try {
    await seedExtra();
  } catch (err) {
    console.error("seedExtra failed", err);
  }
}

/** Blocks only until the original 12_830 embedded statutes/cases are present. Extra corpus is filled in the background. */
export function ensureSeeded(): Promise<void> {
  originalSeeding ??= seedOriginalSafe().catch((err) => {
    originalSeeding = null;
    throw err;
  });
  extraSeeding ??= seedExtraSafe().finally(() => {
    extraSeeding = null;
  });
  return originalSeeding;
}
