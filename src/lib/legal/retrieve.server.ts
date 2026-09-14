import { getDbSource, getSql } from "@/lib/db";
import { TOP_K } from "./config";
import { cosine, embedQuery } from "./embeddings.server";
import { ensureSeeded } from "./seed.server";
import { anonymizeChunk } from "./anonymize";
import { parseArticleRefs, articleMatchSqlValues } from "./article-query";
import { rankRows, type RankRow } from "./rank";
import type { RetrievedChunk, SourceFilter, SourceType } from "./types";

type Row = {
  id: string;
  content: string;
  embedding?: unknown;
  source_type: SourceType;
  source_title: string | null;
  article_number: string | null;
  law_date: string | null;
  source_url: string | null;
  score?: number;
};

/** ردیفی که واقعاً بردار دارد — در چند کوئری تکرار می‌شود. */
const EMBEDDED_PREDICATE =
  "jsonb_typeof(embedding) = 'array' and jsonb_array_length(embedding) > 10";

/** سقف کل نامزدهایی که مسیر jsonb برای rerank معنایی می‌خواند. */
const JSONB_CANDIDATE_LIMIT = 4000;
/** سهم «نامزدهای لغوی» (ردیف‌هایی که FTS مرتبط می‌داند) از سقف بالا. */
const JSONB_LEXICAL_CANDIDATES = 1500;
/** تعداد ردیفی که پس از rerank با محتوای کامل برگردانده می‌شود. */
const VECTOR_RESULT_LIMIT = 30;

type CandidateRow = { id: string; embedding: unknown };

function parseEmbedding(value: unknown): number[] {
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map(Number);
    } catch {
      /* ignore */
    }
  }
  return [];
}

function cleanRow(row: Row): Row {
  const cleaned = anonymizeChunk({
    content: row.content,
    source_title: row.source_title,
    hf_dataset: null,
  });
  return { ...row, content: cleaned.content, source_title: cleaned.source_title };
}

function typeClause(sourceType: SourceFilter, start: number): { sql: string; extra: unknown[] } {
  if (sourceType === "all") return { sql: "", extra: [] };
  return { sql: ` and source_type = $${start}`, extra: [sourceType] };
}

async function retrieveExact(refs: ReturnType<typeof parseArticleRefs>, sourceType: SourceFilter): Promise<RankRow[]> {
  if (refs.length === 0) return [];
  const numbers = [...new Set(refs.flatMap((r) => articleMatchSqlValues(r)))];
  const hint = refs.find((r) => r.lawHint)?.lawHint ?? "";
  const sql = await getSql();

  async function run(useHint: boolean): Promise<Row[]> {
    const typed = typeClause(sourceType, 2);
    const params: unknown[] = [numbers, ...typed.extra];
    let hintSql = "";
    if (useHint && hint) {
      const idx = params.push(`%${hint}%`);
      hintSql = ` and source_title ilike $${idx}`;
    }
    return sql.query<Row>(
      `select id, content, source_type, source_title, article_number, law_date, source_url
       from legal_chunks
       where article_number = any($1::text[])${typed.sql}${hintSql}
       order by case when source_type = 'statute' then 0 when source_type = 'advisory_opinion' then 1 else 2 end
       limit 80`,
      params,
    );
  }

  try {
    let rows = await run(Boolean(hint));
    if (rows.length === 0 && hint) rows = await run(false);
    return rows.map((row) => ({
      ...cleanRow(row),
      matchKind: "exact_article" as const,
    }));
  } catch (err) {
    console.warn("retrieveExact failed; continuing without exact-article hits", err);
    return [];
  }
}

async function retrieveFts(question: string, sourceType: SourceFilter): Promise<RankRow[]> {
  const sql = await getSql();
  const typed = typeClause(sourceType, 2);
  try {
    const rows = await sql.query<Row>(
      `select id, content, source_type, source_title, article_number, law_date, source_url,
              ts_rank(search_text, plainto_tsquery('simple', $1))::float as score
       from legal_chunks
       where search_text @@ plainto_tsquery('simple', $1)${typed.sql}
       order by score desc
       limit 30`,
      [question, ...typed.extra],
    );
    if (rows.length > 0) {
      return rows.map((row) => ({ ...cleanRow(row), matchKind: "fts" as const, semantic: 0 }));
    }
  } catch (err) {
    /* ستون search_text یا GIN ممکن است روی این backend نباشد */
    console.warn("retrieveFts: tsvector path unavailable, falling back to ilike", err);
  }
  const tokens = question
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3)
    .slice(0, 5);
  if (tokens.length === 0) return [];
  const likes = tokens.map((t) => `%${t}%`);
  const likeSql = likes.map((_, i) => `(content ilike $${i + 1} or source_title ilike $${i + 1})`).join(" or ");
  const params: unknown[] = [...likes];
  const extraType =
    sourceType === "all" ? "" : ` and source_type = $${params.push(sourceType)}`;
  try {
    const rows = await sql.query<Row>(
      `select id, content, source_type, source_title, article_number, law_date, source_url
       from legal_chunks
       where (${likeSql})${extraType}
       limit 30`,
      params,
    );
    return rows.map((row) => ({ ...cleanRow(row), matchKind: "fts" as const }));
  } catch (err) {
    console.warn("retrieveFts: ilike fallback failed", err);
    return [];
  }
}

async function retrieveViaPgvector(queryVec: number[], sourceType: SourceFilter): Promise<RankRow[]> {
  if (getDbSource() !== "neon") return [];
  const sql = await getSql();
  const vecLiteral = `[${queryVec.join(",")}]`;
  const typed = typeClause(sourceType, 2);
  try {
    const rows = await sql.query<Row>(
      `select id, content, source_type, source_title, article_number, law_date, source_url,
              (1 - (embedding_vec <=> $1::vector))::float as score
       from legal_chunks
       where embedding_vec is not null${typed.sql}
       order by embedding_vec <=> $1::vector
       limit 30`,
      [vecLiteral, ...typed.extra],
    );
    return rows.map((row) => ({
      ...cleanRow(row),
      matchKind: "vector" as const,
      semantic: Number(row.score ?? 0),
    }));
  } catch (err) {
    console.warn("retrieveViaPgvector failed; falling back to jsonb rerank", err);
    return [];
  }
}

/**
 * مسیر جایگزینِ بازیابی برداری، وقتی pgvector در دسترس نیست (PGLite در
 * preview) یا ستون `embedding_vec` هنوز پر نشده است.
 *
 * ── باگ قبلی (BUG-001) ───────────────────────────────────────────────────
 * کوئری قبلی این بود:
 *
 *     select id, content, embedding, … from legal_chunks
 *     where jsonb_typeof(embedding) = 'array' … limit 4000
 *
 * بدون هیچ `order by`. در Postgres یعنی «هر ۴۰۰۰ ردیفی که اسکن زودتر به آن
 * برسد» — یک زیرمجموعهٔ دلخواه و غیرقطعی از پیکره. پیامد واقعی:
 *   ۱. جست‌وجوی معنایی عملاً فقط روی بخش کوچکی از پیکره اجرا می‌شد و ماده‌ای
 *      که خارج از آن پنجره بود هرگز پیدا نمی‌شد — بی‌صدا، بدون هیچ خطایی.
 *   ۲. دو اجرای یکسانِ همان پرسش می‌توانست دو نتیجهٔ متفاوت بدهد (پس از
 *      VACUUM / تغییر ترتیب فیزیکی ردیف‌ها).
 *   ۳. `content` کاملِ هر ۴۰۰۰ ردیف به RAM می‌آمد، فقط برای اینکه ۳۰تای آن
 *      استفاده شود.
 *
 * ── اصلاح ────────────────────────────────────────────────────────────────
 * ۱. انتخاب نامزدها معیار واقعی دارد و قطعی است: اول ردیف‌هایی که FTS مرتبط
 *    می‌داند (به‌ترتیب `ts_rank`)، سپس تکمیل با یک اسکن قطعیِ `order by id`.
 * ۲. در فاز نامزدی فقط `id` و `embedding` خوانده می‌شود — نه `content`.
 * ۳. `content` فقط برای همان ۳۰ ردیف برندهٔ نهایی خوانده می‌شود.
 *
 * محدودیتی که صادقانه باید گفته شود: این مسیر همچنان یک تقریبِ کران‌دار است،
 * نه جست‌وجوی دقیقِ کل پیکره. جست‌وجوی دقیق روی ۱۳۰k+ ردیف بدون ایندکس
 * برداری ممکن نیست؛ مسیر دقیق همان `retrieveViaPgvector` است که روی Neon
 * فعال می‌شود. تفاوت با قبل این است که زیرمجموعه حالا «مرتبط‌ترین‌ها +
 * پوشش قطعی» است، نه «هر چه اسکن اول دید».
 */
async function retrieveJsonbVectors(
  question: string,
  queryVec: number[],
  sourceType: SourceFilter,
): Promise<RankRow[]> {
  const sql = await getSql();
  const candidates = new Map<string, number[]>();

  const collect = (rows: CandidateRow[]) => {
    for (const row of rows) {
      if (candidates.size >= JSONB_CANDIDATE_LIMIT) return;
      if (candidates.has(row.id)) continue;
      const embedding = parseEmbedding(row.embedding);
      if (embedding.length < 10) continue;
      candidates.set(row.id, embedding);
    }
  };

  // استخر ۱ — ردیف‌هایی که جست‌وجوی متنی مرتبط می‌داند، به ترتیب ts_rank.
  // `id asc` به‌عنوان tie-break تا ترتیب بین دو اجرا ثابت بماند.
  try {
    const typed = typeClause(sourceType, 2);
    collect(
      await sql.query<CandidateRow>(
        `select id, embedding
         from legal_chunks
         where search_text @@ plainto_tsquery('simple', $1)
           and ${EMBEDDED_PREDICATE}${typed.sql}
         order by ts_rank(search_text, plainto_tsquery('simple', $1)) desc, id asc
         limit ${JSONB_LEXICAL_CANDIDATES}`,
        [question, ...typed.extra],
      ),
    );
  } catch (err) {
    // ستون search_text / ایندکس GIN روی این backend نیست — فقط استخر ۲ می‌ماند.
    console.warn("retrieveJsonbVectors: lexical candidate pool unavailable", err);
  }

  // استخر ۲ — پوشش قطعی. `order by id` عمدی است: بدون آن Postgres ترتیب
  // دلخواه برمی‌گرداند و همان BUG-001 برمی‌گردد.
  if (candidates.size < JSONB_CANDIDATE_LIMIT) {
    try {
      const typed = typeClause(sourceType, 1);
      collect(
        await sql.query<CandidateRow>(
          `select id, embedding
           from legal_chunks
           where ${EMBEDDED_PREDICATE}${typed.sql}
           order by id asc
           limit ${JSONB_CANDIDATE_LIMIT}`,
          typed.extra,
        ),
      );
    } catch (err) {
      console.warn("retrieveJsonbVectors: coverage candidate pool failed", err);
    }
  }

  if (candidates.size === 0) return [];

  const scored: { id: string; semantic: number }[] = [];
  for (const [id, embedding] of candidates) {
    scored.push({ id, semantic: cosine(queryVec, embedding) });
  }
  // مرتب‌سازی قطعی: امتیاز نزولی، و در تساوی، id صعودی.
  scored.sort((a, b) => b.semantic - a.semantic || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const top = scored.slice(0, VECTOR_RESULT_LIMIT);
  if (top.length === 0) return [];

  // صریحاً tuple: سازندهٔ Map امضای `readonly [K, V][]` می‌خواهد و استنتاج
  // پیش‌فرضِ `.map()` روی این شکل `(string | number)[][]` می‌شود.
  const semanticById = new Map<string, number>(
    top.map((s): [string, number] => [s.id, s.semantic]),
  );
  const topIds = top.map((s) => s.id);
  try {
    const rows = await sql.query<Row>(
      `select id, content, source_type, source_title, article_number, law_date, source_url
       from legal_chunks
       where id = any($1::text[])`,
      [topIds],
    );
    return rows.map((row) => ({
      ...cleanRow(row),
      matchKind: "vector" as const,
      semantic: semanticById.get(row.id) ?? 0,
    }));
  } catch (err) {
    console.warn("retrieveJsonbVectors: content hydration failed", err);
    return [];
  }
}

export async function retrieveChunks(
  question: string,
  sourceType: SourceFilter,
): Promise<RetrievedChunk[]> {
  await ensureSeeded();
  const refs = parseArticleRefs(question);
  const exact = await retrieveExact(refs, sourceType);
  const fts = await retrieveFts(question, sourceType);
  let vectors: RankRow[] = [];
  try {
    const queryVec = await embedQuery(question);
    vectors = await retrieveViaPgvector(queryVec, sourceType);
    if (vectors.length === 0) {
      vectors = await retrieveJsonbVectors(question, queryVec, sourceType);
    }
  } catch (err) {
    console.error("embedQuery failed; continuing with exact+fts", err);
  }
  return rankRows(question, refs, [...exact, ...fts, ...vectors], TOP_K);
}

export async function corpusStats() {
  void ensureSeeded().catch((err) => console.error("ensureSeeded", err));
  const sql = await getSql();
  const rows = await sql.query<{ source_type: string; n: number }>(
    "select source_type, count(*)::int as n from legal_chunks group by source_type",
  );
  const totalRow = await sql.query<{ n: number }>("select count(*)::int as n from legal_chunks");
  const extra = await sql.query<{ hf_dataset: string; n: number }>(
    `select coalesce(hf_dataset, 'unknown') as hf_dataset, count(*)::int as n
     from legal_chunks group by hf_dataset order by n desc`,
  );
  const embedded = await sql.query<{ n: number }>(
    `select count(*)::int as n from legal_chunks
     where ${EMBEDDED_PREDICATE}`,
  );
  const withSearch = await sql.query<{ n: number }>(
    `select count(*)::int as n from legal_chunks where search_text is not null`,
  ).catch(() => [{ n: 0 }]);
  return {
    total: totalRow[0]?.n ?? 0,
    embedded: embedded[0]?.n ?? 0,
    searchable: withSearch[0]?.n ?? 0,
    byType: Object.fromEntries(rows.map((r) => [r.source_type, r.n])) as Record<string, number>,
    byDataset: Object.fromEntries(extra.map((r) => [r.hf_dataset, r.n])) as Record<string, number>,
    backend: getDbSource(),
  };
}
