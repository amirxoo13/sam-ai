import { createFileRoute } from "@tanstack/react-router";
import { cronAuthorized } from "@/lib/cron-auth";

/**
 * Vercel Cron این مسیر را طبق زمان‌بندی‌ی vercel.json صدا می‌زند (هر بار یک
 * batch کوچک — نه کل سایت یک‌جا). برای جلوگیری از فراخوانی عمومی و مصرف
 * بی‌رویه‌ی اعتبار HuggingFace، پشت یک secret مشترک قفل شده.
 *
 * env لازم: CRON_SECRET — یک رشته‌ی تصادفی که هم اینجا و هم در تنظیمات
 * Cron پروژه (Vercel خودش هدر Authorization را با همین مقدار می‌فرستد وقتی
 * CRON_SECRET تنظیم شده باشد) یکی باشد.
 *
 * fail-closed: اگر CRON_SECRET تنظیم نشده باشد این مسیر 401 می‌دهد و کرال
 * اجرا نمی‌شود. خود تصمیم در `@/lib/cron-auth` زندگی می‌کند تا تست رگرسیون
 * بتواند همین تابع را بسنجد و نه یک کپی از آن.
 */
export const Route = createFileRoute("/api/cron/crawl")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!cronAuthorized(process.env.CRON_SECRET, request.headers.get("authorization"))) {
          if (!process.env.CRON_SECRET?.trim()) {
            console.error("cron/crawl: CRON_SECRET is not set — refusing to run");
          }
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        try {
          const { runCrawlBatch } = await import("@/lib/crawler/run.server");
          const result = await runCrawlBatch(15);
          return Response.json({ ok: true, ...result });
        } catch (err) {
          // پیام خام خطا دیگر در بدنهٔ پاسخ نمی‌رود؛ کاملش در لاگ سرور
          // با یک correlation id می‌نشیند.
          const { logAndBuildErrorResponse } = await import("@/lib/server-error");
          return logAndBuildErrorResponse("api/cron/crawl", err, "crawl tick failed");
        }
      },
    },
  },
});
