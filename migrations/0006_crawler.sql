-- زیرساخت کرال‌کننده‌ی روزانه‌ی سایت‌های حقوقی. طبق خواسته‌ی صریح: دفعه‌ی
-- اول همه‌ی صفحات هر منبع خوانده می‌شود، دفعات بعد فقط صفحات جدید یا
-- تغییرکرده (تشخیص با content_hash).
create table if not exists crawl_source (
  id text primary key,               -- شناسه‌ی کوتاه، مثلاً 'qavanin'
  name text not null,
  base_url text not null,
  seed_urls jsonb not null default '[]'::jsonb,
  allowed_host text not null,        -- کرال فقط داخل همین هاست می‌ماند
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists crawl_page (
  url text primary key,
  source_id text not null references crawl_source(id),
  status text not null default 'pending'
    check (status in ('pending', 'done', 'failed', 'skipped')),
  content_hash text,
  attempts int not null default 0,
  discovered_at timestamptz not null default now(),
  last_crawled_at timestamptz,
  last_error text
);

create index if not exists crawl_page_queue_idx
  on crawl_page (source_id, status, discovered_at);
