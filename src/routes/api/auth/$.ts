import { createFileRoute } from "@tanstack/react-router";

/**
 * این فایل، خودِ better-auth (`@/lib/auth/server`) را به مسیر واقعی HTTP
 * `/api/auth/*` وصل می‌کند — بدون این فایل، `auth` object می‌سازد ولی هیچ
 * درخواستی هرگز بهش نمی‌رسد (دقیقاً همون چیزی که باعث ۴۰۴ روی
 * sign-up/email و get-session و... می‌شد).
 *
 * splat route ($) یعنی هر مسیر زیرِ /api/auth/ (مثل /api/auth/sign-up/email،
 * /api/auth/get-session و غیره) به همین‌جا می‌رسد و better-auth خودش از
 * روی path داخلی تصمیم می‌گیرد چه endpoint‌ای صداشده.
 */
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { auth } = await import("@/lib/auth/server");
        return auth.handler(request);
      },
      POST: async ({ request }) => {
        const { auth } = await import("@/lib/auth/server");
        return auth.handler(request);
      },
    },
  },
});
