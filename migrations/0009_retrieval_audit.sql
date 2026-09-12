-- ستون‌های بازیابی ماده‌به‌ماده + ممیزی هر پرسش حقوقی
alter table legal_chunks add column if not exists search_text tsvector;

create index if not exists legal_chunks_article_idx
  on legal_chunks (article_number);

create index if not exists legal_chunks_search_idx
  on legal_chunks using gin (search_text);

create table if not exists legal_audit_log (
  id bigserial primary key,
  request_id text not null,
  user_id text not null,
  question_hash text not null,
  retrieved_ids jsonb not null,
  match_kinds jsonb,
  cited jsonb,
  unverified jsonb,
  used_fallback boolean not null default false,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists legal_audit_user_idx
  on legal_audit_log (user_id, created_at desc);
