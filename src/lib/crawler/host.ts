/**
 * محدودهٔ مجاز کرال — تابع خالص و قابل تست.
 *
 * باگ قبلی (SEC-006): بررسی با `host.endsWith(source.allowed_host)` انجام می‌شد.
 * این یعنی برای allowed_host = "majlis.ir" هاست‌هایی مثل "evilmajlis.ir" یا
 * "notmajlis.ir" هم مجاز شمرده می‌شدند؛ یک لینک در صفحهٔ دولتی کافی بود تا
 * کرالر به دامنهٔ مهاجم برود و محتوای او را به‌عنوان متن قانون (`source_type
 * = 'statute'`) وارد پیکره کند — یعنی corpus poisoning روی یک سامانهٔ حقوقی.
 *
 * قاعدهٔ درست: یا دقیقاً همان هاست، یا یک زیردامنهٔ واقعی آن (مرز با نقطه).
 */
export function isHostAllowed(host: string, allowedHost: string): boolean {
  const bare = host.trim().toLowerCase().replace(/\.$/, "").replace(/:\d+$/, "");
  const allowed = allowedHost.trim().toLowerCase().replace(/\.$/, "").replace(/:\d+$/, "");
  if (!bare || !allowed) return false;
  return bare === allowed || bare.endsWith(`.${allowed}`);
}
