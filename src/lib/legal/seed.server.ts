import { getSql } from "@/lib/db";
import seed from "@/data/legal-seed.json";
import type { LegalChunk } from "./types";

let seeding: Promise<void> | null = null;

type SeedFile = {
  model: string;
  dim: number;
  chunks: LegalChunk[];
};

const seedFile = seed as SeedFile;

async function seedOnce() {
  const sql = await getSql();
  const existing = await sql.query<{ n: number }>(
    "select count(*)::int as n from legal_chunks",
  );
  if ((existing[0]?.n ?? 0) > 0) return;

  for (const chunk of seedFile.chunks) {
    await sql.query(
      `insert into legal_chunks
        (id, content, embedding, source_type, source_title, article_number, law_date, source_url, source_id, hf_dataset)
       values ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10)
       on conflict (id) do nothing`,
      [
        chunk.id,
        chunk.content,
        JSON.stringify(chunk.embedding),
        chunk.source_type,
        chunk.source_title,
        chunk.article_number,
        chunk.law_date,
        chunk.source_url,
        chunk.source_id,
        chunk.hf_dataset,
      ],
    );
  }
}

export function ensureSeeded(): Promise<void> {
  seeding ??= seedOnce().catch((err) => {
    seeding = null;
    throw err;
  });
  return seeding;
}
