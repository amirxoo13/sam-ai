-- پرونده‌های خصوصی هر کاربر — طبق خواسته‌ی صریح: «پرونده‌های خودشان را
-- اپلود کنن و در اختیار هوش بزارند» و «پرونده‌ی هر کاربر خصوصی هست». هر
-- ردیف فقط به user_id خودش قابل‌دیدنه (اجرای این محدودیت در لایه‌ی
-- سرور است — همه‌ی کوئری‌ها user_id را از context.userی احرازشده می‌گیرند،
-- نه از ورودی کاربر).
create table if not exists user_file (
  id bigserial primary key,
  user_id text not null,
  filename text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists user_file_user_idx
  on user_file (user_id, created_at desc);
