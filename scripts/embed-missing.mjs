#!/usr/bin/env node
/**
 * Embeds legal_chunks that still have empty vectors.
 * Real Hugging Face calls only — never writes a fake or zero vector.
 *
 * Usage:
 *   DATABASE_URL=... HF_TOKEN=... node scripts/embed-missing.mjs
 *   DATABASE_URL=... HF_TOKEN=... node scripts/embed-missing.mjs --limit=200
 *   DATABASE_URL=... HF_TOKEN=... node scripts/embed-missing.mjs --all
 */
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL?.trim();
const HF_TOKEN = process.env.HF_TOKEN?.trim() || process.env.HUGGINGFACE_HUB_TOKEN?.trim();
const MODEL = process.env.EMBEDDING_MODEL || "intfloat/multilingual-e5-small";
const URL = `https://router.huggingface.co/hf-inference/models/${MODEL}/pipeline/feature-extraction`;
const DIM = 384;
const all = process.argv.includes("--all");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const batchSize = Number((limitArg || "--limit=50").split("=")[1]);

function l2(vec) {
  const n = Math.sqrt(vec.reduce((s, x) => s + x * x, 0));
  return n ? vec.map((x) => x / n) : null;
}

async function embed(texts) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      inputs: texts.map((t) => `passage: ${t.slice(0, 1800)}`),
      wait_for_model: true,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`HF HTTP ${res.status}`);
  if (!Array.isArray(json) || json.length !== texts.length) {
    throw new Error("unexpected embedding payload");
  }
  return json.map((row) => {
    if (!Array.isArray(row) || row.length !== DIM) throw new Error("bad dim");
    const v = l2(row.map(Number));
    if (!v) throw new Error("zero vector rejected");
    return v;
  });
}

if (!DATABASE_URL || !HF_TOKEN) {
  console.error("DATABASE_URL and HF_TOKEN are required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });
let hasVec = true;
try {
  await pool.query("alter table legal_chunks add column if not exists embedding_vec vector(384)");
} catch {
  hasVec = false;
}

async function remaining() {
  const { rows } = await pool.query(
    `select count(*)::int as n from legal_chunks
     where jsonb_typeof(embedding) <> 'array' or jsonb_array_length(embedding) < 10`,
  );
  return rows[0]?.n ?? 0;
}

let done = 0;
while (true) {
  const { rows } = await pool.query(
    `select id, left(content, 1800) as content, source_title, article_number from legal_chunks
     where jsonb_typeof(embedding) <> 'array' or jsonb_array_length(embedding) < 10
     order by id
     limit $1`,
    [batchSize],
  );
  if (rows.length === 0) {
    console.log(done === 0 ? "nothing to embed" : `done; embedded ${done}`);
    break;
  }
  const vecs = await embed(rows.map((r) => r.content));
  for (let i = 0; i < rows.length; i++) {
    const vec = vecs[i];
    if (hasVec) {
      await pool.query(
        `update legal_chunks
         set embedding = $2::jsonb,
             embedding_vec = $3::vector,
             search_text = to_tsvector('simple', coalesce($4,'') || ' ' || coalesce($5,'') || ' ' || left(content, 40000))
         where id = $1`,
        [rows[i].id, JSON.stringify(vec), `[${vec.join(",")}]`, rows[i].source_title, rows[i].article_number],
      );
    } else {
      await pool.query(
        `update legal_chunks
         set embedding = $2::jsonb,
             search_text = to_tsvector('simple', coalesce($3,'') || ' ' || coalesce($4,'') || ' ' || left(content, 40000))
         where id = $1`,
        [rows[i].id, JSON.stringify(vec), rows[i].source_title, rows[i].article_number],
      );
    }
  }
  done += rows.length;
  const left = await remaining();
  console.log(`embedded ${done}; remaining ${left} with ${MODEL}`);
  if (!all) break;
}

await pool.end();
