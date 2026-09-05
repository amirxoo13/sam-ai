# SAM AI — Smart Attorney Mind

دستیار حقوقی فارسی با RAG واقعی روی متون حقوق ایران.

پرسش کاربر embed می‌شود (`intfloat/multilingual-e5-small` از Hugging Face Inference)، نزدیک‌ترین قطعات از `legal_chunks` بازیابی می‌شوند، و پاسخ فقط بر اساس همان متن توسط `qwen3.8-max` نوشته می‌شود. زیر هر پاسخ این جمله می‌آید:

> این پاسخ صرفاً اطلاع‌رسانی است و جایگزین مشاوره‌ی حقوقی رسمی نیست

## وضعیت پیکره (الان)

| منبع | نقش | وضعیت |
| --- | --- | --- |
| جدول قوانین کاربر (`db07` / `LawItem.xlsx`) | قوانین موضوعه (`source_type=statute`) | **متن کامل** قوانین اصلی: مدنی، اساسی، مجازات ۱۳۹۹ + تعزیرات، آیین دادرسی مدنی و کیفری، کار، چک، مسئولیت مدنی، اجرای احکام، خانواده، موجر و مستأجر، جرائم رایانه‌ای، … (~۴۹۰۰ ماده). |
| `amirxoo13/persian-legal-rag-jsonl` | قوانین خاص + نظریات مشورتی | ۱۸۰۰ قطعهٔ پالایش‌شده از ۸۲۴۶۴ خام: تجارت، ثبت، تأمین اجتماعی، اراضی، معادن، داوری، … و ۴۰۰ نظریهٔ مشورتی. |
| اسکرپ اختبار (۱۲۶ PDF) | قوانین خاص ماده به ماده | ۱۶۰۰ قطعه از PDFهای دیجیتال اختبار (وکالت، مالیات، دیوان عدالت، گمرک، ثبت احوال، دریایی، …). تکرار قوانین اصلی db07 حذف شد. |
| `QomSSLab/law-text-dataset-fa` | آرای قضایی (`source_type=case_law`) | ۸۰ قطعهٔ واقعی ingest شده (subset) |
| `QomSSLab/legal_full_v4` و چند دیتاست مشابه HF | جایگزین نشده | شخصی / gated — دسترسی رد شد؛ به‌جایش فایل اکسل خود کاربر استفاده شد |
| PDFهای محلی کاربر | همان متن قوانین در قالب اسکن/چاپ | به لپتاپ کاربر دسترسی نیست؛ جدول `LawItem` همان متن استخراج‌شده است |
| qavanin.ir / ara.jri.ac.ir | منابع وب | backlog — آزمون اختبار انجام شد؛ این دو سامانه جستجویی‌اند و خزش صفحهٔ اول کافی نیست |

خام JSONL (~۳۵۳MB) وارد git نمی‌شود. فقط زیرمجموعهٔ پالایش‌شده embed می‌شود.

## اجرا

کلیدها را در Environment با همین اسم‌ها بگذارید: `HF_TOKEN` و `QWEN_API_KEY` (اسم کوتاه `hf` هم خوانده می‌شود). `DATABASE_URL` اگر خالی باشد، پیش‌نمایش روی PGLite با seed JSON کار می‌کند. روی Neon، `scripts/ingest-statutes.mjs` extension `vector` و ستون `embedding_vec` را می‌سازد.

```sh
npm install
HF_TOKEN=... QWEN_API_KEY=... npm run dev
```

Ingest قوانین از فایل کاربر + حفظ آرای موجود:

```sh
python3 scripts/extract-db07.py
HF_TOKEN=... node scripts/ingest-statutes.mjs
```

افزودن زیرمجموعهٔ پالایش‌شده از ریپوی JSONL (بدون جایگزینی پیکرهٔ فعلی):

```sh
python3 scripts/extract-jsonl.py
HF_TOKEN=... node scripts/ingest-jsonl.mjs
```

افزودن PDFهای اسکرپ اختبار (بدون جایگزینی پیکرهٔ فعلی):

```sh
pip install pypdf
python3 scripts/extract-ekhtebar-pdfs.py
HF_TOKEN=... node scripts/ingest-ekhtebar.mjs
```

## API

`POST /api/ask` با `{ "question": "...", "sourceType": "all"|"statute"|"case_law" }`

`GET /api/stats`
