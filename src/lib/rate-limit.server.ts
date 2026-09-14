import { getSql } from "@/lib/db";

/**
 * سقف نرخ درخواست — پنجرهٔ ثابت، با شمارندهٔ اتمیک در Postgres.
 *
 * چرا لازم است (SEC-007): هیچ یک از مسیرهای `/api/ask`، `/api/legal-ask`،
 * `/api/draft` و `/api/residency-ask` سقفی نداشتند، در حالی که هر فراخوانی
 * حداقل یک embedding از HuggingFace و یک completion از Qwen می‌خرد. یک حساب
 * معتبر کافی بود تا در یک حلقه کل سهمیهٔ پروژه را بسوزاند.
 *
 * چرا در DB و نه در حافظه: روی Vercel هر درخواست ممکن است روی یک نمونهٔ
 * تازهٔ lambda اجرا شود؛ شمارندهٔ فرایندی عملاً هیچ چیزی را محدود نمی‌کند.
 * جدول همان Postgres موجود پروژه است (migrations/0011_rate_limit.sql) — نه
 * وابستگی جدید، نه سرویس جدید.
 */

export type RateLimitRule = {
  /** حداکثر درخواست مجاز در هر پنجره. */
  limit: number;
  /** طول پنجره بر‌حسب ثانیه. */
  windowSeconds: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

/** پرسش حقوقی / اقامت: ۲۰ درخواست در دقیقه به‌ازای کاربر. */
export const ASK_RATE_LIMIT: RateLimitRule = { limit: 20, windowSeconds: 60 };

/** تولید پیش‌نویس گران‌تر است (prompt بلندتر): ۱۰ در دقیقه. */
export const DRAFT_RATE_LIMIT: RateLimitRule = { limit: 10, windowSeconds: 60 };

/** هر چند وقت یک‌بار پنجره‌های منقضی‌شده را جمع کن. */
const CLEANUP_PROBABILITY = 0.02;

/**
 * یک واحد از سهمیهٔ `bucketKey` را مصرف می‌کند و نتیجه را برمی‌گرداند.
 *
 * شمارش اتمیک است: `insert … on conflict do update set hits = hits + 1`
 * در یک دستور اجرا می‌شود، پس دو درخواست هم‌زمان نمی‌توانند یک شماره را
 * بخوانند و روی هم بنویسند.
 *
 * رفتار در خطای DB — صریح و عمدی: fail-open با لاگ کامل. این یک کنترل
 * هزینه است، نه یک کنترل دسترسی؛ احراز هویت و گارد ایزولاسیون جداگانه و پیش از
 * این اجرا می‌شوند. اگر اینجا fail-closed می‌شد، یک اختلال گذرای دیتابیس کل
 * سرویس را از کار می‌انداخت. خطا بلعیده نمی‌شود — با سطح error لاگ می‌شود.
 */
export async function consumeRateLimit(
  bucketKey: string,
  rule: RateLimitRule,
): Promise<RateLimitDecision> {
  const { limit, windowSeconds } = rule;
  try {
    const sql = await getSql();
    const rows = await sql.query<{ hits: number; reset_in: number }>(
      `insert into request_rate_limit (bucket_key, window_start, hits)
       values (
         $1,
         to_timestamp(floor(extract(epoch from now())::double precision / $2::int) * $2::int),
         1
       )
       on conflict (bucket_key, window_start)
       do update set hits = request_rate_limit.hits + 1
       returning
         request_rate_limit.hits as hits,
         greatest(
           1,
           ceil(
             extract(
               epoch from (
                 request_rate_limit.window_start + ($2::int * interval '1 second')
               ) - now()
             )
           )::int
         ) as reset_in`,
      [bucketKey, windowSeconds],
    );
    const hits = Number(rows[0]?.hits ?? 1);
    const retryAfterSeconds = Number(rows[0]?.reset_in ?? windowSeconds);

    if (Math.random() < CLEANUP_PROBABILITY) {
      void sql
        .query("delete from request_rate_limit where window_start < now() - interval '1 hour'")
        .catch((err) => console.warn("[rate-limit] cleanup failed", err));
    }

    return {
      allowed: hits <= limit,
      limit,
      remaining: Math.max(0, limit - hits),
      retryAfterSeconds,
    };
  } catch (err) {
    console.error("[rate-limit] counter unavailable — allowing request", err);
    return { allowed: true, limit, remaining: limit, retryAfterSeconds: 0 };
  }
}

/** پاسخ استاندارد ۴۲۹ همراه هدرهای متعارف سقف نرخ. */
export function rateLimitedResponse(decision: RateLimitDecision): Response {
  return Response.json(
    {
      error: "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
      retryAfterSeconds: decision.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(decision.retryAfterSeconds),
        "RateLimit-Limit": String(decision.limit),
        "RateLimit-Remaining": String(decision.remaining),
        "RateLimit-Reset": String(decision.retryAfterSeconds),
      },
    },
  );
}
