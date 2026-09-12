-- گسترش انواع سند برای جای‌دادن صحیح داده‌ی جدید didban8.ir (کنوانسیون‌ها،
-- نظریات مشورتی، اصطلاح‌نامه) — بدون این، مجبور می‌شدیم این‌ها را به‌غلط زیر
-- برچسب statute/case_law جا بزنیم که با اصل «فقط اطلاعات دقیق و واقعی»
-- در تضاد است.
alter table legal_chunks drop constraint if exists legal_chunks_source_type_check;
alter table legal_chunks add constraint legal_chunks_source_type_check
  check (source_type in ('statute', 'case_law', 'convention', 'advisory_opinion', 'terminology'));
