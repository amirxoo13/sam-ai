import { dbSource, getSql } from "@/lib/db";
import { TOP_K } from "./config";
import { cosine, embedQuery } from "./embeddings.server";
import { ensureSeeded } from "./seed.server";
import type { RetrievedChunk, SourceFilter, SourceType } from "./types";

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const EXTRA_DATASETS = [
  "amirxo13/iran-legal-corpus",
  "power-edaalat-anonymized",
];

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

function toEnDigits(s: string): string {
  return s.replace(/[۰-۹]/g, (ch) => String(FA_DIGITS.indexOf(ch)));
}

function parseEmbedding(value: unknown): number[] {
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map(Number);
    } catch {
      /* fall through */
    }
  }
  return [];
}

function citationBoost(question: string, row: Row): number {
  const q = toEnDigits(question);
  const title = toEnDigits(row.source_title ?? "");
  const article = toEnDigits(row.article_number ?? "");
  const content = toEnDigits(row.content);
  let boost = 0;

  for (const m of q.matchAll(/(?:(?:رأی|رای)\s*)?(?:وحدت\s*رویه\s*)?(?:شماره\s*)?(\d{3,4})/g)) {
    const n = m[1];
    if (article === n || content.includes(n) || title.includes(n)) boost += 0.22;
  }
  for (const m of q.matchAll(/(?:ماده|اصل)\s*(\d{1,4})/g)) {
    const n = m[1];
    const exact = article === n || article === `${n}مکرر`;
    const textual = new RegExp(`(?:ماده|اصل)\\s*${n}(?!\\d)`).test(content);
    if (exact || textual) boost += exact ? 0.3 : 0.22;
  }
  if (q.includes("قانون اساسی") && title.includes("قانون اساسی")) boost += 0.12;
  if (q.includes("قانون مدنی") && title.includes("قانون مدنی")) boost += 0.12;
  if (q.includes("صدور چک") && title.includes("صدور چک")) boost += 0.12;
  if (q.includes("مجازات") && title.includes("مجازات اسلامی")) boost += 0.08;
  if (
    (q.includes("تأمین اجتماعی") || q.includes("تامین اجتماعی")) &&
    (title.includes("تأمین اجتماعی") || title.includes("تامین اجتماعی"))
  ) {
    boost += 0.12;
  }
  if (q.includes("قانون تجارت") && title.includes("قانون تجارت")) boost += 0.12;
  if (q.includes("قانون ثبت") && title.includes("قانون ثبت")) boost += 0.12;
  if (q.includes("وکالت") && title.includes("وکالت")) boost += 0.12;
  if (q.includes("دیوان عدالت") && title.includes("دیوان عدالت")) boost += 0.12;
  if (
    (q.includes("وحدت رویه") || q.includes("وحدت رويه")) &&
    (title.includes("وحدت رویه") || content.includes("وحدت رویه"))
  ) {
    boost += 0.14;
  }
  if (
    (q.includes("نظریه مشورتی") || q.includes("نظریات مشورتی")) &&
    (title.includes("نظریات") || title.includes("نظریه") || content.includes("نظریه"))
  ) {
    boost += 0.12;
  }
  return Math.min(boost, 0.55);
}

function tokenize(question: string): string[] {
  const q = toEnDigits(question)
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک");
  const stop = new Set([
    "که", "از", "در", "به", "را", "این", "آن", "با", "برای", "یا", "و",
    "است", "هست", "چیست", "چه", "می", "های", "ها", "یک", "شود", "کرد",
  ]);
  return q
    .split(/[^\u0600-\u06FFa-zA-Z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !stop.has(t));
}

function lexicalScore(question: string, row: Row): number {
  const tokens = tokenize(question);
  if (tokens.length === 0) return 0;
  const hay = `${row.source_title ?? ""}\n${row.content}`;
  let hits = 0;
  for (const t of tokens) {
    if (hay.includes(t)) hits += 1;
  }
  return hits / tokens.length;
}

function toRetrieved(row: Row, score: number): RetrievedChunk {
  return {
    id: row.id,
    content: row.content,
    source_type: row.source_type,
    source_title: row.source_title,
    article_number: row.article_number,
    law_date: row.law_date,
    source_url: row.source_url,
    score,
  };
}

async function retrieveViaPgvector(
  queryVec: number[],
  sourceType: SourceFilter,
): Promise<Row[] | null> {
  if (dbSource !== "neon") return null;
  const sql = await getSql();
  const vecLiteral = `[${queryVec.join(",")}]`;
  try {
    return sourceType === "all"
      ? await sql.query<Row>(
          `select id, content, source_type, source_title, article_number, law_date, source_url,
                  (1 - (embedding_vec <=> $1::vector))::float as score
           from legal_chunks
           where embedding_vec is not null
           order by embedding_vec <=> $1::vector
           limit 40`,
          [vecLiteral],
        )
      : await sql.query<Row>(
          `select id, content, source_type, source_title, article_number, law_date, source_url,
                  (1 - (embedding_vec <=> $1::vector))::float as score
           from legal_chunks
           where source_type = $2 and embedding_vec is not null
           order by embedding_vec <=> $1::vector
           limit 40`,
          [vecLiteral, sourceType],
        );
  } catch {
    return null;
  }
}

async function retrieveLexical(question: string, sourceType: SourceFilter): Promise<Row[]> {
  const tokens = tokenize(question).sort((a, b) => b.length - a.length).slice(0, 4);
  if (tokens.length === 0) return [];
  const sql = await getSql();
  const likes = tokens.map((t) => `%${t}%`);
  const likeClause = likes.map((_, i) => `content ilike $${i + 2}`).join(" or ");
  const params: unknown[] = [EXTRA_DATASETS, ...likes];
  const typeClause =
    sourceType === "all" ? "" : ` and source_type = $${params.push(sourceType)}`;
  try {
    return await sql.query<Row>(
      `select id, content, source_type, source_title, article_number, law_date, source_url
       from legal_chunks
       where hf_dataset = any($1::text[])
         and (${likeClause})${typeClause}
       limit 40`,
      params,
    );
  } catch {
    return [];
  }
}

function rankRows(question: string, queryVec: number[], rows: Row[]): RetrievedChunk[] {
  const byId = new Map<string, RetrievedChunk>();
  for (const row of rows) {
    const embedding = parseEmbedding(row.embedding);
    const hasVec =
      typeof row.score === "number" || embedding.length > 10;
    const semantic = hasVec
      ? typeof row.score === "number"
        ? Number(row.score)
        : cosine(queryVec, embedding)
      : 0;
    const lex = hasVec ? 0 : lexicalScore(question, row);
    const scored = toRetrieved(row, semantic + lex + citationBoost(question, row));
    const prev = byId.get(scored.id);
    if (!prev || scored.score > prev.score) byId.set(scored.id, scored);
  }
  return [...byId.values()]
    .filter((r) => r.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);
}

export async function retrieveChunks(
  question: string,
  sourceType: SourceFilter,
): Promise<RetrievedChunk[]> {
  await ensureSeeded();
  const queryVec = await embedQuery(question);
  const vectorRows = await retrieveViaPgvector(queryVec, sourceType);
  const lexicalRows = await retrieveLexical(question, sourceType);
  if (vectorRows) return rankRows(question, queryVec, [...vectorRows, ...lexicalRows]);

  const sql = await getSql();
  const rows =
    sourceType === "all"
      ? await sql.query<Row>(
          `select id, content, embedding, source_type, source_title, article_number, law_date, source_url
           from legal_chunks
           where jsonb_typeof(embedding) = 'array' and jsonb_array_length(embedding) > 10`,
        )
      : await sql.query<Row>(
          `select id, content, embedding, source_type, source_title, article_number, law_date, source_url
           from legal_chunks
           where source_type = $1
             and jsonb_typeof(embedding) = 'array' and jsonb_array_length(embedding) > 10`,
          [sourceType],
        );
  return rankRows(question, queryVec, [...rows, ...lexicalRows]);
}

export async function corpusStats() {
  await ensureSeeded();
  const sql = await getSql();
  const rows = await sql.query<{ source_type: string; n: number }>(
    "select source_type, count(*)::int as n from legal_chunks group by source_type",
  );
  const totalRow = await sql.query<{ n: number }>(
    "select count(*)::int as n from legal_chunks",
  );
  const extra = await sql.query<{ hf_dataset: string; n: number }>(
    `select coalesce(hf_dataset, 'unknown') as hf_dataset, count(*)::int as n
     from legal_chunks
     group by hf_dataset
     order by n desc`,
  );
  return {
    total: totalRow[0]?.n ?? 0,
    byType: Object.fromEntries(rows.map((r) => [r.source_type, r.n])) as Record<
      string,
      number
    >,
    byDataset: Object.fromEntries(extra.map((r) => [r.hf_dataset, r.n])) as Record<
      string,
      number
    >,
    backend: dbSource,
  };
}
