-- پیام‌های فرم تماس. حتی اگر ارسال ایمیل در لحظه ناموفق باشد،
-- رکورد در Postgres باقی می‌ماند تا دفتر بتواند آن را ببیند.
create table if not exists contact_messages (
  id          text        primary key,
  name        text        not null,
  email       text        not null,
  message     text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists contact_messages_created_idx
  on contact_messages (created_at desc);
