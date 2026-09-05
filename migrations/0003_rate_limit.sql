-- Sliding-window rate limiting for the public legal AI endpoints (/api/ask,
-- /api/draft). Each row is one request; old rows are pruned on every check so
-- the table stays small. Backend-agnostic (same schema on PGLite + Neon).

create table if not exists rate_limit_hits (
  id          bigserial primary key,
  bucket_key  text not null,
  created_at  timestamptz not null default now()
);

create index if not exists rate_limit_hits_bucket_created_idx
  on rate_limit_hits (bucket_key, created_at);
