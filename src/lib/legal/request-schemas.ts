import { z } from "zod";

/**
 * اعتبارسنج‌های ورودیِ مسیرهای HTTP و server functionها.
 *
 * چرا اینجا و نه داخل خود route؟ فایل‌های `src/routes/**` با
 * `createFileRoute` ساخته می‌شوند و در یک اجرای سادهٔ `node --test` قابل
 * import نیستند. تا پیش از این، تستِ امنیتی ناچار بود همین schemaها را
 * دوباره داخل فایل تست بنویسد — پس عملاً کپی خودش را می‌سنجید، نه چیزی که
 * واقعاً deploy می‌شود (BUG-004).
 *
 * حالا مسیرها و تست‌ها هر دو از همین ماژول می‌خوانند. شکل هیچ schemaای تغییر
 * نکرده است؛ قرارداد HTTP دقیقاً همان قبلی است.
 */

/** بدنهٔ `POST /api/ask` و `POST /api/legal-ask`. */
export const askBodySchema = z.object({
  question: z.string().trim().min(4).max(2000),
  sourceType: z
    .enum(["all", "statute", "case_law", "convention", "advisory_opinion", "terminology"])
    .optional(),
  matterId: z.string().uuid().optional(),
});

/** همان ورودی، ولی برای server function که `sourceType` پیش‌فرض دارد. */
export const askFunctionSchema = z.object({
  question: z.string().trim().min(4).max(2000),
  sourceType: z
    .enum(["all", "statute", "case_law", "convention", "advisory_opinion", "terminology"])
    .default("all"),
  matterId: z.string().uuid().optional(),
});

/**
 * بدنهٔ `POST /api/residency-ask`.
 *
 * سقف طول ورودی همسان با `/api/ask` است. بدون سقف، متن دلخواه بزرگ مستقیم به
 * rewrite + embedding + prompt مدل می‌رفت و سهمیه را می‌سوزاند.
 */
export const residencyAskBodySchema = z.object({
  question: z.string().trim().min(4).max(2000),
  jurisdiction: z.enum(["US", "EU"]).optional(),
  country: z.string().trim().max(20).optional(),
});

/** بدنهٔ `POST /api/draft` — `answers` به‌صورت نگاشت آزاد کلید/مقدار. */
export const draftApiBodySchema = z.object({
  story: z.string().trim().min(8).max(8000),
  formId: z.string().trim().max(80).optional(),
  answers: z.record(z.string(), z.string()).optional(),
  hasJudgment: z.boolean().optional(),
});

/** فیلدهای شناخته‌شدهٔ برگهٔ پیش‌نویس (مسیر server function). */
export const draftFieldSchema = z
  .object({
    story: z.string().optional(),
    claimant: z.string().optional(),
    respondent: z.string().optional(),
    city: z.string().optional(),
    amount: z.string().optional(),
    date: z.string().optional(),
    docs: z.string().optional(),
    caseNo: z.string().optional(),
    judgment: z.string().optional(),
  })
  .partial();

/** ورودی `draftLegal` server function. */
export const draftFunctionSchema = z.object({
  story: z.string().trim().min(8).max(8000),
  formId: z.string().trim().max(80).optional(),
  answers: draftFieldSchema.optional(),
  hasJudgment: z.boolean().optional(),
});

/**
 * ورودی آپلود فایل کاربر.
 *
 * سقف سرور در `createUserFile` هم ۴۰٬۰۰۰ است؛ اینجا هم اعمال می‌شود تا payload
 * بزرگ پیش از پردازش رد شود، نه بعد از دریافت کامل.
 */
export const userFileUploadSchema = z.object({
  filename: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(40_000),
  matterId: z.string().uuid().optional(),
});

/** بدنهٔ `POST /api/contact`. */
export const contactBodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(10).max(4000),
});
