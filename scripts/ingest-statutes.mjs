#!/usr/bin/env node
/**
 * Embed the user-provided db07 statute subset and merge into legal-seed.json.
 * Keeps existing case_law embeddings (no re-download of gated HF datasets).
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const HF_TOKEN = process.env.HF_TOKEN || process.env.hf || "";
const DATABASE_URL = (process.env.DATABASE_URL || "").trim();
const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || "intfloat/multilingual-e5-small";
const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM || 384);
const EMBED_URL = `https://router.huggingface.co/hf-inference/models/${EMBEDDING_MODEL}/pipeline/feature-extraction`;
const BATCH = 8;
const CACHE_PATH = join(ROOT, "data/raw/db07/statute-embed-cache.json");

if (!HF_TOKEN) {
  console.error("HF_TOKEN is required");
  process.exit(1);
}

function roundVec(vec) {
  return vec.map((x) => Math.round(Number(x) * 1e6) / 1e6);
}

function l2normalize(vec) {
  let sum = 0;
  for (const x of vec) sum += x * x;
  const n = Math.sqrt(sum);
  if (!n) return vec;
  return vec.map((x) => x / n);
}

async function hfJson(url, { method = "GET", body } = {}, attempt = 0) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 400) };
  }
  if ((res.status === 429 || res.status >= 500) && attempt < 8) {
    const wait = 2000 * (attempt + 1);
    console.warn(`HF ${res.status}, retry in ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
    return hfJson(url, { method, body }, attempt + 1);
  }
  return { ok: res.ok, status: res.status, json };
}

async function embedBatch(texts) {
  const inputs = texts.map((t) => `passage: ${t.slice(0, 1800)}`);
  const { ok, status, json } = await hfJson(EMBED_URL, {
    method: "POST",
    body: { inputs },
  });
  if (!ok) {
    throw new Error(`HF embed HTTP ${status}: ${JSON.stringify(json).slice(0, 400)}`);
  }
  const rows = Array.isArray(json) ? json : [];
  if (rows.length !== texts.length) {
    throw new Error(`embed batch size mismatch: got ${rows.length} expected ${texts.length}`);
  }
  return rows.map((v) => {
    if (!Array.isArray(v) || v.length !== EMBEDDING_DIM) {
      throw new Error(`unexpected embedding dim ${Array.isArray(v) ? v.length : typeof v}`);
    }
    return roundVec(l2normalize(v.map(Number)));
  });
}

async function loadCache() {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(await readFile(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await writeFile(CACHE_PATH, JSON.stringify(cache));
}

async function maybeInsertNeon(chunks) {
  if (!DATABASE_URL) {
    console.log("DATABASE_URL unset — skipping Neon insert");
    return { inserted: 0 };
  }
  const pg = await import("pg");
  const client = new pg.default.Client({ connectionString: DATABASE_URL });
  await client.connect();
  let pgvector = false;
  try {
    await client.query("create extension if not exists vector");
    await client.query(
      `alter table legal_chunks add column if not exists embedding_vec vector(${EMBEDDING_DIM})`,
    );
    pgvector = true;
  } catch (err) {
    console.warn("pgvector not available:", err.message);
  }
  let inserted = 0;
  for (const c of chunks) {
    const vecLiteral = `[${c.embedding.join(",")}]`;
    if (pgvector) {
      await client.query(
        `insert into legal_chunks
          (id, content, embedding, embedding_vec, source_type, source_title, article_number, law_date, source_url, source_id, hf_dataset)
         values ($1,$2,$3::jsonb,$4::vector,$5,$6,$7,$8,$9,$10,$11)
         on conflict (id) do update set
           content = excluded.content,
           embedding = excluded.embedding,
           embedding_vec = excluded.embedding_vec,
           source_title = excluded.source_title`,
        [
          c.id,
          c.content,
          JSON.stringify(c.embedding),
          vecLiteral,
          c.source_type,
          c.source_title,
          c.article_number,
          c.law_date,
          c.source_url,
          c.source_id,
          c.hf_dataset,
        ],
      );
    } else {
      await client.query(
        `insert into legal_chunks
          (id, content, embedding, source_type, source_title, article_number, law_date, source_url, source_id, hf_dataset)
         values ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10)
         on conflict (id) do update set
           content = excluded.content,
           embedding = excluded.embedding,
           source_title = excluded.source_title`,
        [
          c.id,
          c.content,
          JSON.stringify(c.embedding),
          c.source_type,
          c.source_title,
          c.article_number,
          c.law_date,
          c.source_url,
          c.source_id,
          c.hf_dataset,
        ],
      );
    }
    inserted += 1;
  }
  const counts = await client.query(
    `select source_type, count(*)::int as n from legal_chunks group by source_type`,
  );
  await client.end();
  return { inserted, pgvector, counts: counts.rows };
}

async function main() {
  const statutesPath = join(ROOT, "src/data/db07-statutes.json");
  const seedPath = join(ROOT, "src/data/legal-seed.json");
  const selected = JSON.parse(await readFile(statutesPath, "utf8"));
  const previous = JSON.parse(await readFile(seedPath, "utf8"));
  const caseLaw = (previous.chunks || []).filter((c) => c.source_type === "case_law");
  const pending = selected.chunks;
  const cache = await loadCache();
  for (const c of previous.chunks || []) {
    if (
      c.source_type === "statute" &&
      Array.isArray(c.embedding) &&
      c.embedding.length === EMBEDDING_DIM
    ) {
      cache[c.id] ??= c.embedding;
    }
  }
  console.log(
    "statutes to embed",
    pending.length,
    "cached",
    Object.keys(cache).length,
    "existing case_law",
    caseLaw.length,
  );

  const embedded = [];
  for (let i = 0; i < pending.length; i += BATCH) {
    const slice = pending.slice(i, i + BATCH);
    const missing = [];
    for (const chunk of slice) {
      if (Array.isArray(cache[chunk.id]) && cache[chunk.id].length === EMBEDDING_DIM) {
        continue;
      }
      missing.push(chunk);
    }
    if (missing.length) {
      const vecs = await embedBatch(missing.map((c) => c.content));
      for (let k = 0; k < missing.length; k++) {
        cache[missing[k].id] = vecs[k];
      }
      await saveCache(cache);
    }
    for (const chunk of slice) {
      const { dir: _dir, title1: _title1, ...rest } = chunk;
      embedded.push({ ...rest, embedding: cache[chunk.id] });
    }
    console.log(`embedded ${Math.min(i + BATCH, pending.length)}/${pending.length}`);
  }

  const chunks = [...embedded, ...caseLaw];
  const seed = {
    model: EMBEDDING_MODEL,
    dim: EMBEDDING_DIM,
    createdAt: new Date().toISOString(),
    statuteAccess:
      "QomSSLab/legal_full_v4 is personal/gated (access denied). Statutes ingested from the user-provided db07-persian law database (LawItem.xlsx) — complete core codes, not a sample.",
    counts: {
      statute: embedded.length,
      case_law: caseLaw.length,
    },
    sourceNote: selected.why,
    chunks,
  };
  await writeFile(seedPath, JSON.stringify(seed), "utf8");
  console.log("wrote", seedPath, "bytes", Buffer.byteLength(JSON.stringify(seed)));
  const neon = await maybeInsertNeon(chunks);
  console.log("neon", JSON.stringify(neon));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
