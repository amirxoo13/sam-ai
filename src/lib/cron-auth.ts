/**
 * گاردِ fail-closed مسیر Cron.
 *
 * عمداً در یک ماژول خالص و بدون هیچ وابستگی نگه داشته شده تا دقیقاً همین
 * تابع هم در مسیر واقعی اجرا (`src/routes/api/cron/crawl.ts`) صدا زده شود و
 * هم تست رگرسیون بتواند آن را import کند.
 *
 * پیش‌تر تست امنیتی یک کپی از این منطق را داخل خودِ فایل تست تعریف کرده بود؛
 * یعنی اگر کسی مسیر واقعی را دوباره fail-open می‌کرد، تست همچنان سبز
 * می‌ماند (BUG-004).
 *
 * قرارداد: نبودِ `CRON_SECRET` هرگز نباید endpoint را عمومی کند.
 */
export function cronAuthorized(
  secretEnv: string | undefined,
  authHeader: string | null,
): boolean {
  const secret = secretEnv?.trim();
  if (!secret) return false;
  return authHeader === `Bearer ${secret}`;
}
