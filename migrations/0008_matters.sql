-- پرونده به‌عنوان شیء کاری: هر گفتگو و هر فایل به یک matter وصل می‌شود.
create table if not exists matter (
  id text primary key,
  user_id text not null,
  title text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists matter_user_idx on matter (user_id, created_at desc);

alter table user_file add column if not exists matter_id text;
alter table chat_message add column if not exists matter_id text;
alter table chat_message add column if not exists request_id text;

create index if not exists user_file_matter_idx on user_file (user_id, matter_id);
create index if not exists chat_message_matter_idx on chat_message (user_id, matter_id, created_at);
