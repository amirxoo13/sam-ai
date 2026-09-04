import { dbSource, getSql } from "@/lib/db";
import { TOP_K } from "./config";
import { cosine, embedQuery } from "./embeddings.server";
import { ensureSeeded } from "./seed.server";
import type { RetrievedChunk, SourceFilter } from "./types";

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

type Row = {
  id: string;
  content: string;
  embedding?: unknown;
  source_type: "statute" | "case_law";
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
  const hay = toEnDigits(`${row.source_title ?? ""}\n${row.article_number ?? ""}\n${row.content}`);
  let boost = 0;
  const cited = new Set<string>();
  for (const m of q.matchAll(/(?:(?:رأی|رای)\s*)?(?:وحدت\s*رویه\s*)?(?:شماره\s*)?(\d{3,4})/g)) {
    cited.add(m[1]);
  }
  for (const n of cited) {
    if (hay.includes(n)) boost += 0.22;
  }
  return Math.min(boost, 0.5);
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
           order by embedding_vec <=> $1::vector
           limit 40`,
          [vecLiteral],
        )
      : await sql.query<Row>(
          `select id, content, source_type, source_title, article_number, law_date, source_url,
                  (1 - (embedding_vec <=> $1::vector))::float as score
           from legal_chunks
           where source_type = $2
           order by embedding_vec <=> $1::vector
           limit 40`,
          [vecLiteral, sourceType],
        );
  } catch {
    return null;
  }
}

function rankRows(question: string, queryVec: number[], rows: Row[]): RetrievedChunk[] {
  return rows
    .map((row) => {
      const embedding = parseEmbedding(row.embedding);
      const semantic =
        typeof row.score === "number"
          ? Number(row.score)
          : embedding.length
            ? cosine(queryVec, embedding)
            : -1;
      return toRetrieved(row, semantic + citationBoost(question, row));
    })
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
  if (vectorRows) return rankRows(question, queryVec, vectorRows);

  const sql = await getSql();
  const rows =
    sourceType === "all"
      ? await sql.query<Row>(
          "select id, content, embedding, source_type, source_title, article_number, law_date, source_url from legal_chunks",
        )
      : await sql.query<Row>(
          "select id, content, embedding, source_type, source_title, article_number, law_date, source_url from legal_chunks where source_type = $1",
          [sourceType],
        );
  return rankRows(question, queryVec, rows);
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
  return {
    total: totalRow[0]?.n ?? 0,
    byType: Object.fromEntries(rows.map((r) => [r.source_type, r.n])) as Record<
      string,
      number
    >,
    backend: dbSource,
  };
}
