import { getDbSource, getSql } from "@/lib/db";

let vectorEnsured = false;

/** برچسب `hf_dataset` همهٔ ردیف‌هایی که کرالر می‌نویسد. */
export const CRAWLER_DATASET = "crawler";

/** روی PGLite (preview) کاری نمی‌کند — همان مسیر jsonb-only کافی است. */
export async function ensureVectorColumn(): Promise<void> {
  if (getDbSource() !== "neon" || vectorEnsured) return;
  const sql = await getSql();
  try {
    await sql.query("create extension if not exists vector");
    await sql.query("alter table legal_chunks add column if not exists embedding_vec vector(384)");
    await sql.query(
      "create index if not exists legal_chunks_embedding_hnsw on legal_chunks using hnsw (embedding_vec vector_cosine_ops)",
    );
    vectorEnsured = true;
  } catch (err) {
    console.warn("crawler: pgvector column ensure failed:", err);
  }
}

export interface CrawledChunkRow {
  id: string;
  content: string;
  embedding: number[];
  source_title: string;
  sourceId: string;
}

/**
 * همهٔ chunk‌های قبلیِ این URL را پاک می‌کند و نسخهٔ تازه را می‌نویسد —
 * چون با تغییر محتوای صفحه، مرزهای chunk هم ممکن است جابه‌جا شده باشند.
 *
 * مهم (BUG-006): حذف باید فقط ردیف‌های خودِ کرالر را هدف بگیرد. نسخهٔ قبلی
 * `delete from legal_chunks where source_url = $1` بود — بدون هیچ قیدی روی منبع.
 * اما `source_url` روی ردیف‌های پیکرهٔ seed‌شده (qavanin.ir، rc.majlis.ir و همان
 * نشانی‌هایی که دقیقاً هدف کرال هم هستند) هم پر است؛ پس هر بار کرالر یک
 * صفحه را تازه می‌کرد، ممکن بود مواد قانونیِ اصلی و embedding‌دارِ همان نشانی را
 * بی‌صدا حذف کند و با متن خامِ HTML جایگزین کند. دادهٔ رفته بازگشتنی نبود
 * مگر با seed کامل مجدد.
 */
export async function replaceChunksForSourceUrl(
  sourceUrl: string,
  rows: CrawledChunkRow[],
): Promise<void> {
  const sql = await getSql();
  await sql.query("delete from legal_chunks where source_url = $1 and hf_dataset = $2", [
    sourceUrl,
    CRAWLER_DATASET,
  ]);
  for (const r of rows) {
    if (getDbSource() === "neon") {
      const vecLiteral = `[${r.embedding.join(",")}]`;
      await sql.query(
        `insert into legal_chunks
          (id, content, embedding, embedding_vec, source_type, source_title, source_url, source_id, hf_dataset, search_text)
         values ($1,$2,$3::jsonb,$4::vector,$5,$6,$7,$8,$9, to_tsvector('simple', coalesce($6,'') || ' ' || left($2, 40000)))
         on conflict (id) do nothing`,
        [r.id, r.content, JSON.stringify(r.embedding), vecLiteral, "statute", r.source_title, sourceUrl, r.sourceId, CRAWLER_DATASET],
      );
    } else {
      await sql.query(
        `insert into legal_chunks
          (id, content, embedding, source_type, source_title, source_url, source_id, hf_dataset, search_text)
         values ($1,$2,$3::jsonb,$4,$5,$6,$7,$8, to_tsvector('simple', coalesce($5,'') || ' ' || left($2, 40000)))
         on conflict (id) do nothing`,
        [r.id, r.content, JSON.stringify(r.embedding), "statute", r.source_title, sourceUrl, r.sourceId, CRAWLER_DATASET],
      );
    }
  }
}
