-- پر کردن FTS واقعی + ستون ارزیابی ممیزی
-- search_text را از عنوان، شماره ماده و متن می‌سازد؛ بردار جعلی نوشته نمی‌شود.

update legal_chunks
set search_text = to_tsvector(
  'simple',
  coalesce(source_title, '') || ' ' || coalesce(article_number, '') || ' ' || coalesce(left(content, 40000), '')
)
where search_text is null;

alter table legal_audit_log add column if not exists eval jsonb;
