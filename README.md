# SAM AI — Smart Attorney Mind

دستیار حقوقی فارسی با RAG واقعی روی متون حقوق ایران.

پرسش کاربر embed می‌شود (`intfloat/multilingual-e5-small` از Hugging Face Inference)، نزدیک‌ترین قطعات از `legal_chunks` بازیابی می‌شوند، و پاسخ فقط بر اساس همان متن توسط `qwen3.8-max` نوشته می‌شود. زیر هر پاسخ این جمله می‌آید:

> این پاسخ صرفاً اطلاع‌رسانی است و جایگزین مشاوره‌ی حقوقی رسمی نیست

## وضعیت پیکره (الان)

| منبع | نقش | وضعیت |
| --- | --- | --- |
| جدول قوانین کاربر (`db07` / `LawItem.xlsx`) | قوانین موضوعه (`source_type=statute`) | حدود ۵۳۰ ماده از قوانین اصلی ایران ingest شده (اساسی، مدنی، مجازات ۱۳۹۹، آیین دادرسی، چک ۱۴۰۰، …) |
| `QomSSLab/law-text-dataset-fa` | آرای قضایی (`source_type=case_law`) | ۸۰ قطعهٔ واقعی ingest شده (subset) |
| `QomSSLab/legal_full_v4` و چند دیتاست مشابه HF | جایگزین نشده | شخصی / gated — دسترسی رد شد؛ به‌جایش فایل اکسل خود کاربر استفاده شد |
| qavanin.ir / ara.jri.ac.ir | منابع رسمی دولتی | backlog — بدون API رسمی؛ منتظر تأیید قبل از scrape |
| دیتاست‌های QA (Dadrah، بنیاد وکلا، آیین دادرسی) | فاز بعد SFT | دانلود شده در `data/raw/future-sft/` — وارد وکتور استور نشده |

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

## API

`POST /api/ask` با `{ "question": "...", "sourceType": "all"|"statute"|"case_law" }`

`GET /api/stats`
