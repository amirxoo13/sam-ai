-- تاریخچه‌ی مکالمات هر کاربر، برای هر دو چت (حقوقی/کیفری ایران و اقامتی
-- اروپا/آمریکا) در یک جدول مشترک، جدا شده با ستون chat_type. طبق خواسته‌ی
-- کاربر: «هر کاربر ببینه قبلا با هوش چه مکالماتی داشته در هر دو چت‌روم».
create table if not exists chat_message (
  id bigserial primary key,
  user_id text not null,
  chat_type text not null check (chat_type in ('legal', 'residency')),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_message_user_idx
  on chat_message (user_id, chat_type, created_at desc);
