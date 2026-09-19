/**
 * مسیر بازگشت پس از ورود — فقط مسیرهای داخلیِ شناخته‌شده.
 * هرگز به‌صورت پیش‌فرض در URL لاگین نوشته نمی‌شود؛ فقط وقتی pathname
 * خالی/نامعتبر یا خارج از فهرست است، خودِ ناوبری به /ask می‌افتد.
 */
export const LOGIN_NEXT_ROUTES = [
  "/",
  "/ask",
  "/forms",
  "/residency",
  "/profile",
  "/sources",
  "/about",
  "/contact",
] as const;

export type LoginNextRoute = (typeof LOGIN_NEXT_ROUTES)[number];

const BLOCKED = new Set(["/login", "/forgot", "/reset"]);

export function sanitizeReturnTo(raw: unknown): LoginNextRoute | undefined {
  if (typeof raw !== "string") return undefined;
  const path = raw.split("?")[0]?.split("#")[0] ?? "";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return undefined;
  }
  if (BLOCKED.has(path)) return undefined;
  if ((LOGIN_NEXT_ROUTES as readonly string[]).includes(path)) {
    return path as LoginNextRoute;
  }
  return undefined;
}

/** فقط وقتی مسیر نامعتبر است /ask برمی‌گردد — برای Navigate بعد از ورود. */
export function returnToOrAsk(raw: unknown): LoginNextRoute {
  return sanitizeReturnTo(raw) ?? "/ask";
}
