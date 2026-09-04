# SAM AI — Smart Attorney Mind

دستیار حقوقی فارسی با RAG واقعی روی متون حقوق ایران.

پرسش کاربر embed می‌شود (`intfloat/multilingual-e5-small` از Hugging Face Inference)، نزدیک‌ترین قطعات از `legal_chunks` بازیابی می‌شوند، و پاسخ فقط بر اساس همان متن توسط `qwen3.8-max` نوشته می‌شود. زیر هر پاسخ این جمله می‌آید:

> این پاسخ صرفاً اطلاع‌رسانی است و جایگزین مشاوره‌ی حقوقی رسمی نیست

## وضعیت پیکره (الان)

| منبع | نقش | وضعیت |
| --- | --- | --- |
| `QomSSLab/law-text-dataset-fa` | آرای قضایی (`source_type=case_law`) | ۸۰ قطعهٔ واقعی ingest شده (subset) |
| `QomSSLab/legal_full_v4` | قوانین موضوعه (`source_type=statute`) | **gated (manual)** — تا تأیید دسترسی HF، صفر ردیف |
| qavanin.ir / ara.jri.ac.ir | منابع رسمی دولتی | backlog — بدون API رسمی؛ منتظر تأیید قبل از scrape |
| دیتاست‌های QA (Dadrah، بنیاد وکلا، آیین دادرسی) | فاز بعد SFT | دانلود شده در `data/raw/future-sft/` — وارد وکتور استور نشده |
| بنچمارک eval | ارزیابی آینده | `sasanbarok` دانلود شد (JSON ناقص در ردیف ۱۶)؛ QomSSLab bench gated |

## اجرا

کلیدها را به‌صورت env بدهید (`HF_TOKEN`, `QWEN_API_KEY`). `DATABASE_URL` اگر خالی باشد، پیش‌نمایش روی PGLite با seed JSON کار می‌کند. روی Neon، `scripts/ingest-legal.mjs` extension `vector` و ستون `embedding_vec` را می‌سازد.

```sh
npm install
HF_TOKEN=... QWEN_API_KEY=... npm run dev
```

Ingest زیرمجموعه:

```sh
HF_TOKEN=... LIMIT=80 node scripts/ingest-legal.mjs
```

## API

`POST /api/ask` با `{ "question": "...", "sourceType": "all"|"statute"|"case_law" }`

`GET /api/stats`
