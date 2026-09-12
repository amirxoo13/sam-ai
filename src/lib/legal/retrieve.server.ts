import { dbSource, getSql } from "@/lib/db";
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
      hintSql = ` and (source_title ilike $${idx} or content ilike $${idx})`;
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
  } catch {
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
  } catch {
    /* ستون search_text یا GIN ممکن است روی این backend نباشد */
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
  } catch {
    return [];
  }
}

async function retrieveViaPgvector(queryVec: number[], sourceType: SourceFilter): Promise<RankRow[]> {
  if (dbSource !== "neon") return [];
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
  } catch {
    return [];
  }
}

async function retrieveJsonbVectors(
  queryVec: number[],
  sourceType: SourceFilter,
): Promise<RankRow[]> {
  const sql = await getSql();
  try {
    const rows =
      sourceType === "all"
        ? await sql.query<Row>(
            `select id, content, embedding, source_type, source_title, article_number, law_date, source_url
             from legal_chunks
             where jsonb_typeof(embedding) = 'array' and jsonb_array_length(embedding) > 10
             limit 4000`,
          )
        : await sql.query<Row>(
            `select id, content, embedding, source_type, source_title, article_number, law_date, source_url
             from legal_chunks
             where source_type = $1
               and jsonb_typeof(embedding) = 'array' and jsonb_array_length(embedding) > 10
             limit 4000`,
            [sourceType],
          );
    const scored: RankRow[] = [];
    for (const row of rows) {
      const embedding = parseEmbedding(row.embedding);
      if (embedding.length < 10) continue;
      scored.push({
        ...cleanRow(row),
        matchKind: "vector",
        semantic: cosine(queryVec, embedding),
      });
    }
    scored.sort((a, b) => (b.semantic ?? 0) - (a.semantic ?? 0));
    return scored.slice(0, 30);
  } catch {
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
    if (vectors.length === 0) vectors = await retrieveJsonbVectors(queryVec, sourceType);
  } catch (err) {
    console.error("embedQuery failed; continuing with exact+fts", err);
  }
  return rankRows(question, refs, [...exact, ...fts, ...vectors], TOP_K);
}

export async function corpusStats() {
  await ensureSeeded();
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
     where jsonb_typeof(embedding) = 'array' and jsonb_array_length(embedding) > 10`,
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
    backend: dbSource,
  };
}
