#!/usr/bin/env node
/**
 * ingest-didban8.mjs — وارد کردن پیکره‌ی didban8.ir (اجرای ۱۲ سپتامبر ۲۰۲۶،
 * تطابق ۱۰۰٪ با موجودی رسمی سایت، طبق amirxoo13/moshir/DATA.md) به
 * legal_chunks. پنج بانک واقعی، جمعاً ۶۳٬۳۰۳ رکورد:
 *   قوانین (۴۱٬۶۰۲ ماده) · کنوانسیون‌ها (۴٬۲۳۹ ماده) ·
 *   نظریات مشورتی (۹٬۸۶۴) · آرای وحدت رویه (۶۱۲) · ترمینولوژی (۶٬۹۸۶ واژه)
 *
 * این اسکریپت محلی است — نه بخشی از اپ سرورless. مثل ingest-legal.mjs و
 * ingest-qavanin.mjs که از قبل توی پروژه بودن، روی سیستم خودت اجرا می‌شود
 * چون هزاران فراخوانی HF Inference لازم دارد (ساعت‌ها طول می‌کشد) — روی
 * Vercel امکان اجرای این‌قدر طولانی نیست.
 *
 * پیش‌نیاز env (.env.local یا export مستقیم):
 *   DATABASE_URL   — همان DATABASE_URL پروژه‌ی sam-ai (پیکره‌ی حقوقی)
 *   HF_TOKEN       — توکن هاگینگ‌فیس با دسترسی به دیتاست خصوصی
 *                    amirxo13/moshir-legal-data
 *
 * اجرا:
 *   node scripts/ingest-didban8.mjs
 *
 * Resumable: اگر وسط کار قطع شد (Ctrl+C، قطعی اینترنت، ...)، دوباره اجرا
 * کن — embedding های قبلی از cache محلی خوانده می‌شوند (دوباره پول
 * HuggingFace خرج نمی‌شود) و ردیف‌های از قبل insert شده با
 * ON CONFLICT DO NOTHING رد می‌شوند.
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
const HF_RESOLVE_BASE = `https://huggingface.co/datasets/${HF_DATASET}/resolve/main`;

const RAW_DIR = join(ROOT, "data/raw/didban8");
const CACHE_PATH = join(ROOT, "data/raw/didban8/embed-cache.json");
const BATCH = 8;
const CHUNK_MAX = 1400;

if (!HF_TOKEN) {
  console.error("HF_TOKEN لازم است (باید به دیتاست خصوصی amirxo13/moshir-legal-data دسترسی داشته باشد).");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("DATABASE_URL لازم است — همان دیتابیس پروژه‌ی sam-ai.");
  process.exit(1);
}

// ── دانلود فایل‌های خام از دیتاست خصوصی (کش محلی، فقط یک‌بار دانلود) ────────
async function downloadIfMissing(remoteName) {
  await mkdir(RAW_DIR, { recursive: true });
  const dest = join(RAW_DIR, remoteName);
  if (existsSync(dest)) {
    console.log(`✓ از قبل موجود: ${remoteName}`);
    return dest;
  }
  console.log(`⬇ دانلود ${remoteName} ...`);
  const res = await fetch(`${HF_RESOLVE_BASE}/didban8/out_final/${remoteName}`, {
    headers: { Authorization: `Bearer ${HF_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`دانلود ${remoteName} شکست خورد: HTTP ${res.status} — دسترسی HF_TOKEN به دیتاست خصوصی را چک کن`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  console.log(`  ذخیره شد (${(buf.length / 1e6).toFixed(1)} مگابایت)`);
  return dest;
}

// ── chunking — عیناً همان الگوی ingest-legal.mjs ───────────────────────────
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

/** اگر article_label با یک عدد شروع شود همان را برمی‌گرداند، وگرنه null —
 *  از حدس‌زدن شماره ماده وقتی مطمئن نیستیم پرهیز می‌کنیم. */
function leadingNumber(label) {
  if (!label) return null;
  const m = String(label).trim().match(/^(\d+)/);
  return m ? m[1] : null;
}

// ── ۵ بانک didban8 → قالب یکسان chunk خام (قبل از تقسیم/embed) ────────────
function flattenLaws(json) {
  const out = [];
  for (const law of json.laws || []) {
    for (const a of law.articles || []) {
      out.push({
        rawId: `law:${a.item_id}`,
        content: a.content || "",
        source_type: "statute",
        source_title: law.category ? `${law.law_title} — ${law.category}` : law.law_title,
        article_number: leadingNumber(a.article_label),
        law_date: null,
        source_url: "https://didban8.ir/",
      });
    }
  }
  return out;
}

function flattenConventions(json) {
  const out = [];
  for (const conv of json.conventions || []) {
    for (const a of conv.articles || []) {
      out.push({
        rawId: `con:${a.item_id}`,
        content: a.content || "",
        source_type: "convention",
        source_title: conv.title,
        article_number: null,
        law_date: null,
        source_url: "https://didban8.ir/",
      });
    }
  }
  return out;
}

function flattenOpinions(json) {
  const out = [];
  for (const yearGroup of json.years || []) {
    for (const op of yearGroup.opinions || []) {
      out.push({
        rawId: `opin:${op.opinion_id}`,
        content: op.content || "",
        source_type: "advisory_opinion",
        source_title: yearGroup.year_title,
        article_number: op.shomarenazarie ? `نظریه ${op.shomarenazarie}` : null,
        law_date: null,
        source_url: "https://didban8.ir/",
      });
    }
  }
  return out;
}

function flattenVerdicts(json) {
  const out = [];
  for (const v of json.verdicts || []) {
    out.push({
      rawId: `ara:${v.verdict_id}`,
      content: v.content || "",
      source_type: "case_law",
      source_title: v.group || "رأی وحدت رویه",
      article_number: v.vote_no ? String(v.vote_no) : null,
      law_date: v.date || null,
      source_url: "https://didban8.ir/",
    });
  }
  return out;
}

function flattenTerminology(json) {
  const out = [];
  for (const t of json.terms || []) {
    out.push({
      rawId: `term:${t.term_id}`,
      content: t.content ? `${t.word}: ${t.content}` : t.word,
      source_type: "terminology",
      source_title: `اصطلاح‌نامه حقوقی — حرف ${t.letter || ""}`.trim(),
      article_number: null,
      law_date: null,
      source_url: "https://didban8.ir/",
    });
  }
  return out;
}

// ── HF embedding با retry (عیناً الگوی موجود در ingest-qavanin.mjs) ────────
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

async function loadCache() {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(await readFile(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await mkdir(dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(cache), "utf8");
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
    console.warn("pgvector در دسترس نیست، فقط ستون jsonb پر می‌شود:", err.message);
  }

  const [lawsPath, convPath, opinPath, verdPath, termPath] = await Promise.all([
    downloadIfMissing("didban8_laws.json"),
    downloadIfMissing("didban8_conventions.json"),
    downloadIfMissing("didban8_opinions.json"),
    downloadIfMissing("didban8_verdicts.json"),
    downloadIfMissing("didban8_terminology.json"),
  ]);

  const raw = [
    ...flattenLaws(JSON.parse(await readFile(lawsPath, "utf8"))),
    ...flattenConventions(JSON.parse(await readFile(convPath, "utf8"))),
    ...flattenOpinions(JSON.parse(await readFile(opinPath, "utf8"))),
    ...flattenVerdicts(JSON.parse(await readFile(verdPath, "utf8"))),
    ...flattenTerminology(JSON.parse(await readFile(termPath, "utf8"))),
  ];
  console.log(`جمع رکورد خام: ${raw.length.toLocaleString("fa-IR")}`);

  // تقسیم به chunk نهایی با id پایدار و قابل‌تکرار
  const items = [];
  for (const rec of raw) {
    if (!rec.content || !rec.content.trim()) continue; // طبق اصل «حذف نکردن»، فقط رکورد بی‌متن رد می‌شود، نه کل منبع
    const pieces = chunkText(rec.content);
    pieces.forEach((content, i) => {
      items.push({
        id: `didban8:${rec.rawId}:${i}`,
        content,
        source_type: rec.source_type,
        source_title: rec.source_title,
        article_number: rec.article_number,
        law_date: rec.law_date,
        source_url: rec.source_url,
      });
    });
  }
  console.log(`جمع chunk نهایی برای embed: ${items.length.toLocaleString("fa-IR")}`);

  const cache = await loadCache();
  let inserted = 0;
  let skippedExisting = 0;
  let cacheHits = 0;

  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const embeddings = [];
    const toEmbed = [];
    const toEmbedIdx = [];

    batch.forEach((it, idx) => {
      const key = contentHash(it.content);
      if (cache[key]) {
        embeddings[idx] = cache[key];
        cacheHits += 1;
      } else {
        toEmbed.push(it.content);
        toEmbedIdx.push(idx);
      }
    });

    if (toEmbed.length > 0) {
      const vecs = await hfEmbedBatch(toEmbed);
      toEmbedIdx.forEach((idx, j) => {
        embeddings[idx] = vecs[j];
        cache[contentHash(batch[idx].content)] = vecs[j];
      });
    }

    for (let j = 0; j < batch.length; j++) {
      const it = batch[j];
      const embedding = embeddings[j];
      try {
        if (pgvector) {
          const vecLiteral = `[${embedding.join(",")}]`;
          const r = await client.query(
            `insert into legal_chunks
              (id, content, embedding, embedding_vec, source_type, source_title, article_number, law_date, source_url, hf_dataset)
             values ($1,$2,$3::jsonb,$4::vector,$5,$6,$7,$8,$9,$10)
             on conflict (id) do nothing`,
            [
              it.id, it.content, JSON.stringify(embedding), vecLiteral,
              it.source_type, it.source_title, it.article_number, it.law_date, it.source_url,
              "amirxo13/moshir-legal-data",
            ],
          );
          if (r.rowCount > 0) inserted += 1; else skippedExisting += 1;
        } else {
          const r = await client.query(
            `insert into legal_chunks
              (id, content, embedding, source_type, source_title, article_number, law_date, source_url, hf_dataset)
             values ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9)
             on conflict (id) do nothing`,
            [
              it.id, it.content, JSON.stringify(embedding),
              it.source_type, it.source_title, it.article_number, it.law_date, it.source_url,
              "amirxo13/moshir-legal-data",
            ],
          );
          if (r.rowCount > 0) inserted += 1; else skippedExisting += 1;
        }
      } catch (err) {
        console.error(`insert failed for ${it.id}:`, err.message);
      }
    }

    if ((i / BATCH) % 25 === 0) {
      await saveCache(cache);
      console.log(
        `پیشرفت: ${Math.min(i + BATCH, items.length).toLocaleString("fa-IR")}/${items.length.toLocaleString("fa-IR")}` +
          ` — inserted=${inserted} skipped=${skippedExisting} cacheHits=${cacheHits}`,
      );
    }
  }

  await saveCache(cache);
  console.log("\n=== تمام شد ===");
  console.log(`inserted=${inserted}  skippedExisting(از قبل بود)=${skippedExisting}  cacheHits=${cacheHits}`);
  await client.end();
}

main().catch((err) => {
  console.error("ingest-didban8 شکست خورد:", err);
  process.exit(1);
});
