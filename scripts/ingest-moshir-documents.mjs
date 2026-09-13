#!/usr/bin/env node
/**
 * ingest-moshir-documents.mjs — وارد کردن پیکره‌ی سندهای واقعی (آرا، بخشنامه‌ها،
 * توضیح مواد قانونی، نظریات مشورتی، ...) از amirxo13/moshir-legal-data زیر
 * مسیر sam-ai/New folder (4)/dataset/{documents,laws}/** — همان ~۱۰هزار
 * پرونده‌ای که قرار است مدل بفهمد رویه‌ی دادرسی ایران چطور کار می‌کند.
 *
 * برخلاف didban8 (۵ فایل بزرگ یک‌جا)، این پیکره هزاران فایل JSON کوچک زیر
 * ۲۵۶ پوشه‌ی shard (00 تا ff) در دو زیرشاخه (documents/, laws/) است. هر
 * فایل schema یکسان و تمیزی دارد (تأییدشده با بازرسی چند نمونه‌ی واقعی):
 *   { id, title, url, host, docKind, domain, authority, status,
 *     jurisdiction, articleCount, charCount, text }
 * برخلاف didban8، اینجا هر رکورد یک source_url واقعی و مشخص دارد (نه فقط
 * آدرس کلی سایت) — چون از صفحات واقعی (ekhtebar.ir, dotic.ir, ...) استخراج
 * شده‌اند.
 *
 * پوشه‌های آزمایشی/تکراری زیر مجموعه‌ی «New folder (4)» عمداً وارد نمی‌شوند
 * (نه به این معنی که از مخزن اصلی حذف شده باشند — فقط ingest نمی‌شوند، چون
 * طبق نامشان کپی/آزمایشی‌اند و وارد کردنشان یعنی محتوای تکراری در پایگاه
 * دانش، که با اصل «فقط اطلاعات دقیق» در تضاد است): _duplicates، _stale،
 * _old، _probe، _test2، _test3، _test_out.
 *
 * env لازم: DATABASE_URL، HF_TOKEN (دقیقاً مثل ingest-didban8.mjs)
 * اجرا:   node scripts/ingest-moshir-documents.mjs
 * Resumable: مثل ingest-didban8.mjs — cache محلی + ON CONFLICT DO NOTHING.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const HF_TOKEN = (process.env.HF_TOKEN || "").trim();
const DATABASE_URL = (process.env.DATABASE_URL || "").trim();
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "intfloat/multilingual-e5-small";
const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM || 384);
const EMBED_URL = `https://router.huggingface.co/hf-inference/models/${EMBEDDING_MODEL}/pipeline/feature-extraction`;
const HF_DATASET = "amirxo13/moshir-legal-data";
const HF_API_BASE = `https://huggingface.co/api/datasets/${HF_DATASET}/tree/main`;
const HF_RESOLVE_BASE = `https://huggingface.co/datasets/${HF_DATASET}/resolve/main`;
const BASE_PATH = "sam-ai/New folder (4)/dataset";
const SHARD_NAMES = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

const CACHE_PATH = join(ROOT, "data/raw/moshir-documents/embed-cache.json");
const FILELIST_CACHE_PATH = join(ROOT, "data/raw/moshir-documents/filelist-cache.json");
const CHUNK_MAX = 1400;

if (!HF_TOKEN) {
  console.error("HF_TOKEN لازم است.");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("DATABASE_URL لازم است.");
  process.exit(1);
}

async function listShard(subdir, shard) {
  const url = `${HF_API_BASE}/${encodeURIComponent(`${BASE_PATH}/${subdir}/${shard}`)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${HF_TOKEN}` } });
  if (res.status === 404) return []; // shard خالی/وجود ندارد
  if (!res.ok) throw new Error(`لیست‌کردن ${subdir}/${shard} شکست خورد: HTTP ${res.status}`);
  const json = await res.json();
  return (Array.isArray(json) ? json : [])
    .filter((e) => e.type === "file" && e.path.endsWith(".json"))
    .map((e) => e.path);
}

async function discoverAllFiles() {
  if (existsSync(FILELIST_CACHE_PATH)) {
    console.log("✓ فهرست فایل‌ها از کش محلی خوانده شد");
    return JSON.parse(await readFile(FILELIST_CACHE_PATH, "utf8"));
  }
  const all = [];
  for (const subdir of ["documents", "laws"]) {
    for (const shard of SHARD_NAMES) {
      const paths = await listShard(subdir, shard);
      all.push(...paths);
      if (paths.length > 0 && all.length % 500 < paths.length) {
        console.log(`  ${subdir}/${shard}: ${paths.length} فایل (جمع تاکنون: ${all.length})`);
      }
    }
  }
  await mkdir(dirname(FILELIST_CACHE_PATH), { recursive: true });
  await writeFile(FILELIST_CACHE_PATH, JSON.stringify(all), "utf8");
  console.log(`جمع فایل کشف‌شده: ${all.length.toLocaleString("fa-IR")}`);
  return all;
}

function chunkText(text, maxLen = CHUNK_MAX) {
  const cleaned = (text || "").replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];
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
  return chunks.filter((c) => c.length >= 10);
}

/** docKind واقعی رکورد را به یکی از دو نوع مجاز نگاشت می‌کند — بدون حدس،
 *  فقط بر اساس وجود واژه‌ی «رأی/رای» در docKind. */
function mapSourceType(docKind) {
  const k = (docKind || "").trim();
  return /رأی|رای/.test(k) ? "case_law" : "statute";
}

async function hfEmbedBatch(texts, attempt = 0) {
  const inputs = texts.map((t) => `passage: ${t.slice(0, 1800)}`);
  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs, options: { wait_for_model: true } }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 400) };
  }
  if ((res.status === 429 || res.status >= 500) && attempt < 8) {
    const wait = 2000 * (attempt + 1);
    console.warn(`  HF ${res.status}, تلاش دوباره در ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
    return hfEmbedBatch(texts, attempt + 1);
  }
  if (!res.ok) throw new Error(`HF embed HTTP ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  const rows = Array.isArray(json) ? json : [];
  if (rows.length !== texts.length) {
    throw new Error(`تعداد بردار (${rows.length}) با ورودی (${texts.length}) نمی‌خواند`);
  }
  return rows.map((v) => {
    if (!Array.isArray(v) || v.length !== EMBEDDING_DIM) {
      throw new Error(`بعد بردار غیرمنتظره: ${Array.isArray(v) ? v.length : typeof v}`);
    }
    return v.map(Number);
  });
}

function contentHash(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

async function loadCache(path) {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return {};
  }
}

async function saveCache(path, cache) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(cache), "utf8");
}

async function fetchDoc(path) {
  const res = await fetch(`${HF_RESOLVE_BASE}/${path.split("/").map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${HF_TOKEN}` },
  });
  if (!res.ok) throw new Error(`دانلود ${path} شکست خورد: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const pg = await import("pg");
  const client = new pg.default.Client({ connectionString: DATABASE_URL });
  await client.connect();

  let pgvector = false;
  try {
    await client.query("create extension if not exists vector");
    await client.query(`alter table legal_chunks add column if not exists embedding_vec vector(${EMBEDDING_DIM})`);
    await client.query(
      "create index if not exists legal_chunks_embedding_hnsw on legal_chunks using hnsw (embedding_vec vector_cosine_ops)",
    );
    pgvector = true;
  } catch (err) {
    console.warn("pgvector در دسترس نیست:", err.message);
  }

  const files = await discoverAllFiles();
  const embedCache = await loadCache(CACHE_PATH);
  const docCache = await loadCache(join(ROOT, "data/raw/moshir-documents/doc-cache.json"));

  let inserted = 0;
  let skippedExisting = 0;
  let downloadFailed = 0;

  for (let fi = 0; fi < files.length; fi++) {
    const path = files[fi];
    let rec = docCache[path];
    if (!rec) {
      try {
        rec = await fetchDoc(path);
        docCache[path] = rec;
      } catch (err) {
        downloadFailed += 1;
        console.warn(`  رد شد (دانلود ناموفق): ${path} — ${err.message}`);
        continue;
      }
    }
    if (!rec.text || !rec.text.trim()) continue; // رکورد بی‌متن، طبق اصل «حذف نکردن» فقط همین رکورد رد می‌شود

    const pieces = chunkText(rec.text);
    const idPrefix = contentHash(rec.id || path);
    const sourceType = mapSourceType(rec.docKind);

    for (let ci = 0; ci < pieces.length; ci++) {
      const content = pieces[ci];
      const id = `moshir:${idPrefix}:${ci}`;
      const key = contentHash(content);
      let embedding = embedCache[key];
      if (!embedding) {
        const [vec] = await hfEmbedBatch([content]);
        embedding = vec;
        embedCache[key] = vec;
      }
      try {
        if (pgvector) {
          const vecLiteral = `[${embedding.join(",")}]`;
          const r = await client.query(
            `insert into legal_chunks
              (id, content, embedding, embedding_vec, source_type, source_title, source_url, hf_dataset)
             values ($1,$2,$3::jsonb,$4::vector,$5,$6,$7,$8)
             on conflict (id) do nothing`,
            [id, content, JSON.stringify(embedding), vecLiteral, sourceType, rec.title || null, rec.url || null, "amirxo13/moshir-legal-data"],
          );
          if (r.rowCount > 0) inserted += 1; else skippedExisting += 1;
        } else {
          const r = await client.query(
            `insert into legal_chunks
              (id, content, embedding, source_type, source_title, source_url, hf_dataset)
             values ($1,$2,$3::jsonb,$4,$5,$6,$7)
             on conflict (id) do nothing`,
            [id, content, JSON.stringify(embedding), sourceType, rec.title || null, rec.url || null, "amirxo13/moshir-legal-data"],
          );
          if (r.rowCount > 0) inserted += 1; else skippedExisting += 1;
        }
      } catch (err) {
        console.error(`insert failed for ${id}:`, err.message);
      }
    }

    if (fi % 100 === 0) {
      await saveCache(CACHE_PATH, embedCache);
      await saveCache(join(ROOT, "data/raw/moshir-documents/doc-cache.json"), docCache);
      console.log(
        `پیشرفت: ${fi.toLocaleString("fa-IR")}/${files.length.toLocaleString("fa-IR")} فایل` +
          ` — inserted=${inserted} skipped=${skippedExisting} downloadFailed=${downloadFailed}`,
      );
    }
  }

  await saveCache(CACHE_PATH, embedCache);
  await saveCache(join(ROOT, "data/raw/moshir-documents/doc-cache.json"), docCache);
  console.log("\n=== تمام شد ===");
  console.log(`فایل پردازش‌شده=${files.length}  inserted=${inserted}  skippedExisting=${skippedExisting}  downloadFailed=${downloadFailed}`);
  await client.end();
}

main().catch((err) => {
  console.error("ingest-moshir-documents شکست خورد:", err);
  process.exit(1);
});
