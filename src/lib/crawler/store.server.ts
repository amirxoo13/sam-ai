import { dbSource, getSql } from "@/lib/db";

let vectorEnsured = false;

/** روی PGLite (preview) کاری نمی‌کند — همان مسیر jsonb-only کافی است. */
export async function ensureVectorColumn(): Promise<void> {
  if (dbSource !== "neon" || vectorEnsured) return;
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
 * همه‌ی chunk‌های قبلیِ این URL را پاک می‌کند و نسخه‌ی تازه را می‌نویسد —
 * چون با تغییر محتوای صفحه، مرزهای chunk هم ممکن است جابه‌جا شده باشند.
 */
export async function replaceChunksForSourceUrl(
  sourceUrl: string,
  rows: CrawledChunkRow[],
): Promise<void> {
  const sql = await getSql();
  await sql.query("delete from legal_chunks where source_url = $1", [sourceUrl]);
  for (const r of rows) {
    if (dbSource === "neon") {
      const vecLiteral = `[${r.embedding.join(",")}]`;
      await sql.query(
        `insert into legal_chunks
          (id, content, embedding, embedding_vec, source_type, source_title, source_url, source_id, hf_dataset)
         values ($1,$2,$3::jsonb,$4::vector,$5,$6,$7,$8,$9)
         on conflict (id) do nothing`,
        [r.id, r.content, JSON.stringify(r.embedding), vecLiteral, "statute", r.source_title, sourceUrl, r.sourceId, "crawler"],
      );
    } else {
      await sql.query(
        `insert into legal_chunks
          (id, content, embedding, source_type, source_title, source_url, source_id, hf_dataset)
         values ($1,$2,$3::jsonb,$4,$5,$6,$7,$8)
         on conflict (id) do nothing`,
        [r.id, r.content, JSON.stringify(r.embedding), "statute", r.source_title, sourceUrl, r.sourceId, "crawler"],
      );
    }
  }
}
