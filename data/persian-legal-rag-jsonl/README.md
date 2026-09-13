# Persian legal RAG JSONL

مجموعهٔ قطعه‌بندی‌شدهٔ متن‌های **حقوقی، کیفری و قوانین** که لایهٔ متن آن‌ها تمیز و قابل استخراج بود.

این ریپو PDF خام ندارد. فقط خروجی تبدیل‌شده است.

## آمار

- قطعه‌ها: **83030**
- فایل منبع یکتا: **846**
- تقریب واژه: **40128544**
- آستانهٔ پذیرش: hit_rate > 0.35 پس از NFKC و یکسان‌سازی `ي→ی` / `ك→ک`
- اسکن و فونت‌خراب تبدیل نشده‌اند (OCR و حدس حروف انجام نشد)

## فایل‌ها

- `data/dataset_part_00.jsonl` — 21031 chunks, 85.0 MB
- `data/dataset_part_01.jsonl` — 20820 chunks, 84.6 MB
- `data/dataset_part_02.jsonl` — 17613 chunks, 85.0 MB
- `data/dataset_part_03.jsonl` — 20101 chunks, 85.0 MB
- `data/dataset_part_04.jsonl` — 3465 chunks, 15.6 MB

- `metadata/sources.json` — فهرست نام فایل‌های منبع و تعداد قطعه
- `metadata/dataset_summary.json` — آمار و قواعد تبدیل
- `metadata/record_schema.json` — فیلدهای هر خط JSONL

برای خواندن کل مجموعه، فایل‌های `data/dataset_part_*.jsonl` را به ترتیب به هم بچسبانید.

## طرح هر قطعه

هر خط یک JSON با `ensure_ascii=false` است:

- `id`, `source_file`, `book_title`, `author`, `chapter`
- `chunk_index`, `total_chunks_in_file`
- `text`, `word_count`, `had_corrections`, `domain`

رقم و واژه با حدس اصلاح نشده است. موارد مشکوک در تبدیل فقط لاگ شده‌اند و اینجا نیامده‌اند.

## محدوده

فقط متن قابل استخراج تمیز. متون اسکن‌شده، فونت خراب، انتخاب رشته، روانشناسی عمومی و راهنمای دکتری داخل این مجموعه نیستند.

منبع‌ها کتاب، جزوه و قانون‌اند؛ حق نشر با پدیدآورندگان اصلی می‌ماند. این یک نسخهٔ کاری خصوصی برای RAG است، نه انتشار رسمی قوانین.
