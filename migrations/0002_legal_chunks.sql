-- Legal RAG corpus. Embeddings stored as jsonb float arrays so the same
-- schema runs on preview PGLite (no extensions) and on Neon.
-- On Neon, scripts/ingest-legal.mjs also enables pgvector and a vector column.

create table if not exists legal_chunks (
  id              text primary key,
  content         text not null,
  embedding       jsonb not null,
  source_type     text not null check (source_type in ('statute', 'case_law')),
  source_title    text,
  article_number  text,
  law_date        text,
  source_url      text,
  source_id       text,
  hf_dataset      text,
  created_at      timestamptz not null default now()
);

create index if not exists legal_chunks_source_type_idx
  on legal_chunks (source_type);

create index if not exists legal_chunks_hf_dataset_idx
  on legal_chunks (hf_dataset);
