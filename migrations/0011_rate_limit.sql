-- سقف نرخ درخواست برای مسیرهای پرهزینه (embedding + مدل تولید متن).
--
-- شمارندهٔ پنجرهٔ ثابت. در خود Postgres نگه داشته می‌شود و نه در حافظهٔ
-- فرایند، چون روی Vercel هر درخواست ممکن است به یک نمونهٔ تازهٔ lambda برود؛
-- شمارندهٔ in-memory عملاً هیچ سقفی اعمال نمی‌کند.
create table if not exists request_rate_limit (
  bucket_key   text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (bucket_key, window_start)
);

-- برای پاک‌سازی دوره‌ای پنجره‌های منقضی‌شده.
create index if not exists request_rate_limit_window_idx
  on request_rate_limit (window_start);
