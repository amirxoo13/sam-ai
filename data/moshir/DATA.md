# داده‌ها و آرشیو پروژه

این مخزن **کد** پروژه را نگه می‌دارد. پیکره‌های حجیم حقوقی در یک دیتاست **خصوصی**
روی HuggingFace است، چون حجم کل از سقف‌های GitHub عبور می‌کند.

## مقصد داده‌ها

| مقصد | آدرس | محتوا |
|---|---|---|
| HuggingFace (خصوصی) | `amirxo13/moshir-legal-data` | ۶۱٬۲۲۰ فایل داده، ۱۲.۳۲ گیگابایت |
| این مخزن | `amirxoo13/moshir` | کد، اسکریپت‌ها، متادیتا، مستندات |

آرشیو HuggingFace در دو دسته آپلود شد: دسته اول ۵۷٬۴۸۲ فایل (۵.۱۳ گیگابایت) داده
و کد پروژه، و دسته دوم ۳٬۷۳۸ فایل (۷.۱۹ گیگابایت) کتابخانه منابع حقوقی.

فهرست کامل با هش SHA-256 هر فایل در `data/manifests/` است:
`huggingface-archive-manifest.csv` برای دسته اول و
`huggingface-archive-manifest-2.csv` برای دسته دوم. هر ردیف شامل مسیر مقصد در
HuggingFace، مسیر اصلی روی دیسک، حجم و هش است.

## ساختار آرشیو HuggingFace

```
sam-ai/          کل محتوای پروژه از پوشه Desktop\sam-ai با ساختار اصلی
  Telegram Desktop/ChatExport_*/files/
                 کتابخانه منابع حقوقی — ۲٬۴۲۲ کتاب و جزوه PDF
  Telegram Desktop/ChatExport_2026-09-04/files/legal_rag_pilot/
                 خط لوله OCR و تمیزسازی PDF با واژه‌نامه و مدل tessdata فارسی
didban8/
  out_final/     خروجی نهایی دیدبان۸ — ۶۳٬۳۰۳ رکورد
  out/           چک‌پوینت‌های خزش HTML و خروجی لایه HTML
  api_cache/     پاسخ خام پنج API معتبر سایت
  code/          اسکریپت‌های خزش و مونتاژ و راستی‌آزمایی
MANIFEST.csv     فهرست کامل با هش
```

## کتابخانه منابع حقوقی

۲٬۴۲۲ کتاب و جزوه حقوقی فارسی با حجم ۶.۹۹ گیگابایت، زیر مسیرهای
`sam-ai/Telegram Desktop/ChatExport_*/files/`. نمونه عناوین: اصول فقه سمیرا
محمدی، محشای قانون مجازات اسلامی، حقوق تجارت ربیعا اسکینی، اشخاص و اموال حسین
صفایی، حقوق مدنی قربانی، آیین دادرسی کیفری، حقوق بین‌الملل عمومی بیگدلی.

این‌ها ماده خام OCR برای خط لوله `data-pipeline/legal-rag-pilot/` هستند.

## پیکره دیدبان۸ (didban8.ir)

اجرای کامل ۱۲ سپتامبر ۲۰۲۶، با تطابق ۱۰۰٪ با موجودی رسمی سایت:

| بانک | رکورد | منبع |
|---|---|---|
| قوانین | ۴۱٬۶۰۲ ماده | `POST /api/v1/searchlaw` |
| کنوانسیون‌ها | ۴٬۲۳۹ ماده | `POST /api/v1/searchcon` |
| نظریات مشورتی | ۹٬۸۶۴ نظریه | `POST /api/v1/searchopin` |
| آرای وحدت رویه | ۶۱۲ رأی | `POST /api/v1/searchara` |
| ترمینولوژی | ۶٬۹۸۶ واژه | `POST /api/v1/searchterm` |
| **جمع** | **۶۳٬۳۰۳** | |

مجموع متن: حدود ۴۰.۷ میلیون کاراکتر. صفر رکورد تکراری و صفر رکورد خالی، به‌جز یک
ماده کنوانسیون (`item_id=2296`) که در دیتابیس خود سایت `content` خالی دارد و طبق
اصل «حذف نکردن داده» با شناسه‌اش حفظ شده.

معماری دولایه است: پنج endpoint JSON منبع معتبر متن‌اند، و خزش HTML مسیر
`/v2/*Item` با `id=0` لایه متادیتا (برچسب ماده، breadcrumb، تاریخ، شماره) را
می‌دهد که با join روی `item_id` به رکوردها اضافه می‌شود. خزش HTML به تنهایی ۶۳٬۰۷۷
رکورد می‌دهد، چون ۱۶۶ ماده قانون و ۶۱ ماده کنوانسیون در نمای ناشناس وب رندر
نمی‌شوند. این کسری در دو اجرای مستقل عیناً تکرار شد.

بازتولید:

```bash
pip install requests beautifulsoup4 lxml
python data-pipeline/didban8/didban8_scraper.py   # لایه متادیتا، حدود ۳۵ دقیقه
python data-pipeline/didban8/assemble_final.py    # لایه معتبر و ساخت خروجی
python data-pipeline/didban8/verify_final.py      # راستی‌آزمایی مستقل
```

## پوشه archive

`archive/sam-ai-desktop-20260912/` نسخه کامل کد working copy پوشه `Desktop\sam-ai`
است (آخرین کامیت آن ۵ سپتامبر ۲۰۲۶ به‌همراه ۱۰۹ تغییر کامیت‌نشده).

این کد **جداگانه** آرشیو شده و روی `src/` اصلی مخزن ریخته نشده، چون آن مخزن و این
working copy هیچ commit مشترکی ندارند و کد فعلی مخزن جدیدتر است و زیرسیستم
کامل‌تری در `src/lib/legal/` دارد. رویش ریختن نسخه قدیمی‌تر می‌توانست اپ را بشکند.

فایل‌های JSON حجیم seed اپ (`legal-seed.json`، `qavanin-selected.json`،
`jsonl-selected.json`، `db07-statutes.json`، `ekhtebar-selected.json`) در این آرشیو
گیت نیستند و عیناً در دیتاست HuggingFace زیر مسیر `sam-ai/src/data/` قرار دارند.

## خط لوله legal-rag-pilot

`data-pipeline/legal-rag-pilot/` خط لوله استخراج و تمیزسازی متن از PDFهای حقوقی
است: `preflight.py` سلامت هر PDF را می‌سنجد، `_extract_raw.py` متن خام را
می‌کشد، `ocr_page1_empty.py` صفحه‌های بدون لایه متنی را با tesseract فارسی OCR
می‌کند، `process_clean_legal.py` نرمال‌سازی NFKC و تصحیح واژه‌ها را با واژه‌نامه
`lexicon/fa_lilak.dic` انجام می‌دهد، و `pipeline_pilot.py` کل مسیر را اجرا
می‌کند. گزارش‌های `report.md` و `06_chapter_compare.md` نتیجه اجرای پایلوت‌اند.

فایل‌های `.pyc` و خروجی‌های حجیم میانی در گیت نیستند و در آرشیو HuggingFace
زیر مسیر اصلی خود قرار دارند.

## خارج از دامنه

این موارد از پوشه `Desktop\sam-ai` منتقل نشدند چون به این پروژه مربوط نیستند یا
بازتولیدشدنی‌اند: نصب‌کننده‌های `exe` و `msi` (۳۷۰ مگابایت)، فایل‌های `apk`
اندروید (۱۹۱ مگابایت)، آرشیوهای `zip` و `rar`، فایل‌های PSD و تصاویر گرافیکی،
پروژه پلتفرم آسترولوژی، و دیتاست‌های اسکرپر مخاطبین.

دو مورد آگاهانه و به دلیل امنیتی منتقل نشدند: فایل `默认业务空间-apiKey-1119743.csv`
که کلید API داشت، و کانفیگ‌های `*.ovpn` که اعتبارنامه VPN دارند.

## دسترسی به داده‌ها

```python
from huggingface_hub import snapshot_download

snapshot_download(
    repo_id="amirxo13/moshir-legal-data",
    repo_type="dataset",
    local_dir="./data",
    token="<HF_TOKEN>",
)
```

برای یک فایل مشخص:

```python
from huggingface_hub import hf_hub_download

hf_hub_download(
    repo_id="amirxo13/moshir-legal-data",
    repo_type="dataset",
    filename="didban8/out_final/didban8_laws.json",
    token="<HF_TOKEN>",
)
```
