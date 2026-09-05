# SAM AI — Smart Attorney Mind

دستیار حقوقی فارسی با RAG واقعی روی متون حقوق ایران.

پرسش کاربر embed می‌شود (`intfloat/multilingual-e5-small` از Hugging Face Inference)، نزدیک‌ترین قطعات از `legal_chunks` بازیابی می‌شوند، و پاسخ فقط بر اساس همان متن توسط `qwen3.8-max` نوشته می‌شود. زیر هر پاسخ این جمله می‌آید:

> این پاسخ صرفاً اطلاع‌رسانی است و جایگزین مشاوره‌ی حقوقی رسمی نیست

## وضعیت پیکره (الان)

| منبع | نقش | وضعیت |
| --- | --- | --- |
| جدول قوانین کاربر (`db07` / `LawItem.xlsx`) | قوانین موضوعه (`source_type=statute`) | **متن کامل** قوانین اصلی: مدنی، اساسی، مجازات ۱۳۹۹ + تعزیرات، آیین دادرسی مدنی و کیفری، کار، چک، مسئولیت مدنی، اجرای احکام، خانواده، موجر و مستأجر، جرائم رایانه‌ای، … (~۴۹۰۰ ماده). |
| `amirxoo13/persian-legal-rag-jsonl` | قوانین خاص + نظریات مشورتی + آرای وحدت رویه | ۱۸۰۰ قطعهٔ پالایش‌شده از ۸۲۴۶۴ خام، به‌علاوه دلتای آرای وحدت رویه ۸۰۲–۸۶۱ و نظریات مشورتی خرداد/تیر ۱۴۰۵. جزوه، تست و پاورپوینت حذف شدند. |
| اسکرپ اختبار (۱۲۶ PDF) | قوانین خاص ماده به ماده | ۱۶۰۰ قطعه از PDFهای دیجیتال اختبار (وکالت، مالیات، دیوان عدالت، گمرک، ثبت احوال، دریایی، …). تکرار قوانین اصلی db07 حذف شد. |
| `QomSSLab/law-text-dataset-fa` | آرای قضایی (`source_type=case_law`) | ۸۰ قطعهٔ واقعی ingest شده (subset) |
| `QomSSLab/legal_full_v4` و چند دیتاست مشابه HF | جایگزین نشده | شخصی / gated — دسترسی رد شد؛ به‌جایش فایل اکسل خود کاربر استفاده شد |
| PDFهای محلی کاربر | همان متن قوانین در قالب اسکن/چاپ | به لپتاپ کاربر دسترسی نیست؛ جدول `LawItem` همان متن استخراج‌شده است |
| qavanin.ir (اسکرپ TreeText صفحات ۱–۱۰۲) | قوانین و مقررات رسمی + آرای دیوان عدالت | **۳۹۲۴ قطعه ingestشده** از ۱۵۴۱ سند تمیز (قانون، آیین‌نامه، رأی دیوان، دستورالعمل، تصویب‌نامه، مصوبه، بخشنامه). صفحات فهرست و پاسخ خالی آروان حذف شدند. ara.jri.ac.ir هنوز backlog است. |

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

فقط فایل‌های جدید ریپو (بدون بازچینش ۱۸۰۰ قطعهٔ قبلی):

```sh
python3 scripts/extract-jsonl-delta.py
HF_TOKEN=... node scripts/ingest-jsonl.mjs
```

افزودن PDFهای اسکرپ اختبار (بدون جایگزینی پیکرهٔ فعلی):

```sh
pip install pypdf
python3 scripts/extract-ekhtebar-pdfs.py
HF_TOKEN=... node scripts/ingest-ekhtebar.mjs
```

افزودن خروجی اسکرپ qavanin.ir (TreeText):

```sh
python3 scripts/extract-qavanin.py
HF_TOKEN=... node scripts/ingest-qavanin.mjs
```

## API

`POST /api/ask` با `{ "question": "...", "sourceType": "all"|"statute"|"case_law" }`

`POST /api/draft` با `{ "story": "...", "formId?": "...", "answers?": { ... }, "hasJudgment?": true }`
پیش‌نویس شکواییه / دادخواست / لایحه پس از تشخیص مسیر حقوقی یا کیفری.

`GET /api/stats`

## برگه‌ها و دادرسی

صفحهٔ `/forms` ماجرا را می‌گیرد، مسیر (حقوقی / کیفری / هر دو / اداری) را تشخیص می‌دهد،
قالب اوراق رایج ایران را پر می‌کند و مواد مرتبط را از پیکره بازیابی می‌کند.

آرای قابل استناد از منابع رسمی ناشناس (`ara.jri.ac.ir`) و قوانین (`qavanin.ir`) می‌آید.
سایت‌هایی که پروندهٔ واقعی با هویت طرفین را منتشر کرده‌اند وارد پیکره نمی‌شوند.
