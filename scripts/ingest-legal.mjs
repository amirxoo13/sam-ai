#!/usr/bin/env node
/**
 * Real ingest for SAM AI.
 *
 * Category 1 (vector store):
 *   - QomSSLab/legal_full_v4  → source_type=statute  (gated: reported, not faked)
 *   - QomSSLab/law-text-dataset-fa → source_type=case_law
 *
 * Writes src/data/legal-seed.json (real HF embeddings) for preview PGLite.
 * When DATABASE_URL is set, also inserts into Neon and tries pgvector.
 *
 * Usage:
 *   HF_TOKEN=... node scripts/ingest-legal.mjs
 *   HF_TOKEN=... LIMIT=80 node scripts/ingest-legal.mjs
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const HF_TOKEN = process.env.HF_TOKEN || "";
const DATABASE_URL = (process.env.DATABASE_URL || "").trim();
const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || "intfloat/multilingual-e5-small";
const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM || 384);
const EMBED_URL = `https://router.huggingface.co/hf-inference/models/${EMBEDDING_MODEL}/pipeline/feature-extraction`;
const LIMIT = Number(process.env.LIMIT || 90);
const BATCH = 8;

if (!HF_TOKEN) {
  console.error("HF_TOKEN is required");
  process.exit(1);
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function toEnDigits(s) {
  return String(s).replace(/[۰-۹]/g, (ch) => String(FA_DIGITS.indexOf(ch)));
}

function parseMeta(text) {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const head = lines[0] || "";
  const crumbs = head
    .split(/\s*>\s*/)
    .map((c) => c.replace(/^#+\s*/, "").trim())
    .filter(Boolean);
  const sourceTitle =
    crumbs.find((c) => /قانون|رأی|رای|آیین|ماده|وحدت/.test(c)) ||
    crumbs[0] ||
    head.slice(0, 80);

  const articleMatch = text.match(/ماده\s*([۰-۹0-9]+(?:\s*مکرر)?)/);
  const dateMatch = text.match(/((?:۱۳|۱۴)[۰-۹0-9]{2}(?:[/-][۰-۹0-9]{1,2}){0,2})/);
  const rulingMatch = text.match(
    /رأ[يی]\s*وحدت[‌\s]*رویه\s*شماره\s*([۰-۹0-9]+(?:\s*[–-]\s*[۰-۹0-9]+)?)/,
  );

  let kind = "case_law";
  if (/^قانون\b/.test(sourceTitle) || /قانون .+> ماده/.test(head)) {
    kind = "statute-like";
  }

  const rulingTitle = rulingMatch
    ? `رأی وحدت رویه شماره ${toEnDigits(rulingMatch[1])} هیأت عمومی`
    : null;

  return {
    sourceTitle: (rulingTitle || sourceTitle).slice(0, 180),
    articleNumber: rulingMatch
      ? toEnDigits(rulingMatch[1]).trim()
      : articleMatch
        ? toEnDigits(articleMatch[1]).trim()
        : null,
    lawDate: dateMatch ? toEnDigits(dateMatch[1]) : null,
    kind,
  };
}

function chunkText(text, maxLen = 1400) {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (cleaned.length <= maxLen) return [cleaned];
  const paras = cleaned.split(/\n{2,}/);
  const chunks = [];
  let buf = "";
  for (const p of paras) {
    if ((buf + "\n\n" + p).length > maxLen && buf) {
      chunks.push(buf.trim());
      buf = p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.filter((c) => c.length >= 180);
}

async function hfJson(url, { method = "GET", body } = {}) {
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
    return v.map(Number);
  });
}

async function fetchRows(dataset, offset, length) {
  const url =
    `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(dataset)}` +
    `&config=default&split=train&offset=${offset}&length=${length}`;
  const { ok, status, json } = await hfJson(url);
  if (!ok) return { error: { status, json }, rows: [] };
  const rows = (json.rows || []).map((r) => r.row || r);
  return { error: null, rows, numRowsTotal: json.num_rows_total };
}

async function tryGatedDataset() {
  const id = "QomSSLab/legal_full_v4";
  const api = await hfJson(`https://huggingface.co/api/datasets/${id}`);
  const readme = await fetch(
    `https://huggingface.co/datasets/${id}/resolve/main/README.md`,
    { headers: { Authorization: `Bearer ${HF_TOKEN}` } },
  );
  const rows = await fetchRows(id, 0, 2);
  return {
    id,
    apiStatus: api.status,
    gated: api.json?.gated ?? null,
    private: api.json?.private ?? null,
    siblings: (api.json?.siblings || []).map((s) => s.rfilename),
    readmeStatus: readme.status,
    readmeSnippet: (await readme.text()).slice(0, 280),
    rowsError: rows.error,
  };
}

function isJunk(text) {
  if (!text || text.length < 280) return true;
  if (/دانلود فایل پی دی اف|کلیک کنید/.test(text) && text.length < 600) return true;
  return false;
}

async function collectCaseLaw() {
  const dataset = "QomSSLab/law-text-dataset-fa";
  const offsets = [0, 80, 200, 600, 1200, 2000, 3500, 5000, 7000, 9000, 11000];
  const seen = new Set();
  const collected = [];
  for (const off of offsets) {
    const { error, rows, numRowsTotal } = await fetchRows(dataset, off, 20);
    if (error) {
      console.warn("rows error", off, error.status);
      continue;
    }
    if (off === 0) console.log("law-text-dataset-fa num_rows_total", numRowsTotal);
    for (const [i, row] of rows.entries()) {
      const text = typeof row.text === "string" ? row.text.trim() : "";
      if (isJunk(text)) continue;
      const key = text.slice(0, 180);
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push({ offset: off + i, text });
    }
    if (collected.length >= LIMIT * 2) break;
  }
  return collected;
}

async function downloadSample(dataset, dest, n = 40) {
  const { error, rows, numRowsTotal } = await fetchRows(dataset, 0, n);
  const out = {
    dataset,
    fetchedAt: new Date().toISOString(),
    numRowsTotal: numRowsTotal ?? null,
    error,
    sampleCount: rows.length,
    columns: rows[0] ? Object.keys(rows[0]) : [],
    rows,
  };
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, JSON.stringify(out, null, 2), "utf8");
  return { dataset, dest, sampleCount: rows.length, error: error ? error.status : null, columns: out.columns, numRowsTotal };
}

async function maybeInsertNeon(chunks) {
  if (!DATABASE_URL) {
    console.log("DATABASE_URL unset — skipping Neon insert (preview uses seed JSON + PGLite)");
    return { inserted: 0, pgvector: false };
  }
  const pg = await import("pg");
  const client = new pg.default.Client({ connectionString: DATABASE_URL });
  await client.connect();
  await client.query("select 1 as ok");
  let pgvector = false;
  try {
    await client.query("create extension if not exists vector");
    await client.query(
      `alter table legal_chunks add column if not exists embedding_vec vector(${EMBEDDING_DIM})`,
    );
    await client.query(
      `create index if not exists legal_chunks_embedding_hnsw
       on legal_chunks using hnsw (embedding_vec vector_cosine_ops)`,
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
         on conflict (id) do nothing`,
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
         on conflict (id) do nothing`,
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
  const sample = await client.query(
    `select id, source_type, source_title, article_number, left(content, 180) as preview
     from legal_chunks order by created_at desc limit 2`,
  );
  await client.end();
  return { inserted, pgvector, counts: counts.rows, sample: sample.rows };
}

async function main() {
  console.log("=== SAM AI ingest ===");
  console.log("embedding model", EMBEDDING_MODEL, "dim", EMBEDDING_DIM);

  const gated = await tryGatedDataset();
  console.log("legal_full_v4 status", JSON.stringify(gated, null, 2).slice(0, 2000));

  await mkdir(join(ROOT, "data/raw/future-sft"), { recursive: true });
  await mkdir(join(ROOT, "data/raw/eval"), { recursive: true });
  await mkdir(join(ROOT, "data/raw/reports"), { recursive: true });
  await mkdir(join(ROOT, "src/data"), { recursive: true });

  const sft = [
    "PerSets/iran-legal-persian-qa",
    "Marykka/Bonyad_Vokala_Legal_QA_Dataset",
    "hamidsalimi/Persian-Civil-Procedure1-QA-Dataset-AYIN-DADRESI-MADANI-1",
    "QomSSLab/main_law_qa",
  ];
  const evalSets = [
    "QomSSLab/Legal_SyntheticLegalQA-Bench-v2",
    "sasanbarok/iran-legal-Faq-dataset",
  ];
  const downloads = [];
  for (const ds of sft) {
    const dest = join(
      ROOT,
      "data/raw/future-sft",
      ds.replace("/", "__") + ".sample.json",
    );
    try {
      downloads.push(await downloadSample(ds, dest, 30));
    } catch (err) {
      downloads.push({ dataset: ds, error: String(err) });
    }
  }
  for (const ds of evalSets) {
    const dest = join(ROOT, "data/raw/eval", ds.replace("/", "__") + ".sample.json");
    try {
      downloads.push(await downloadSample(ds, dest, 30));
    } catch (err) {
      downloads.push({ dataset: ds, error: String(err) });
    }
  }
  console.log("raw downloads", downloads);

  const cases = await collectCaseLaw();
  console.log("collected case-law docs", cases.length);

  const pending = [];
  for (const doc of cases) {
    const meta = parseMeta(doc.text);
    const parts = chunkText(doc.text);
    for (const [ci, content] of parts.entries()) {
      pending.push({
        id: `case-${doc.offset}-${ci}`,
        content,
        source_type: "case_law",
        source_title: meta.sourceTitle,
        article_number: meta.articleNumber,
        law_date: meta.lawDate,
        source_url: "https://huggingface.co/datasets/QomSSLab/law-text-dataset-fa",
        source_id: String(doc.offset),
        hf_dataset: "QomSSLab/law-text-dataset-fa",
      });
      if (pending.length >= LIMIT) break;
    }
    if (pending.length >= LIMIT) break;
  }
  console.log("chunks to embed", pending.length);

  const embedded = [];
  for (let i = 0; i < pending.length; i += BATCH) {
    const slice = pending.slice(i, i + BATCH);
    const vecs = await embedBatch(slice.map((c) => c.content));
    for (let j = 0; j < slice.length; j++) {
      embedded.push({ ...slice[j], embedding: vecs[j] });
    }
    console.log(`embedded ${Math.min(i + BATCH, pending.length)}/${pending.length}`);
  }

  const seed = {
    model: EMBEDDING_MODEL,
    dim: EMBEDDING_DIM,
    createdAt: new Date().toISOString(),
    statuteAccess:
      "QomSSLab/legal_full_v4 is gated (manual). HF token could not download parquet/README. Statute source_type rows are therefore 0 until access is granted at https://huggingface.co/datasets/QomSSLab/legal_full_v4",
    counts: {
      statute: embedded.filter((c) => c.source_type === "statute").length,
      case_law: embedded.filter((c) => c.source_type === "case_law").length,
    },
    chunks: embedded,
  };

  const seedPath = join(ROOT, "src/data/legal-seed.json");
  await writeFile(seedPath, JSON.stringify(seed), "utf8");
  console.log("wrote", seedPath, "bytes", (await readFile(seedPath)).length);

  const neon = await maybeInsertNeon(embedded);
  console.log("neon", JSON.stringify(neon, null, 2));

  const report = {
    gated,
    downloads,
    seedCounts: seed.counts,
    sample: embedded.slice(0, 2).map((c) => ({
      id: c.id,
      source_type: c.source_type,
      source_title: c.source_title,
      article_number: c.article_number,
      law_date: c.law_date,
      dim: c.embedding.length,
      preview: c.content.slice(0, 220),
    })),
    neon,
  };
  await writeFile(
    join(ROOT, "data/raw/reports/ingest-report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  console.log("DONE", JSON.stringify(seed.counts));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
