import { createFileRoute } from "@tanstack/react-router";

/**
 * Vercel Cron این مسیر را طبق زمان‌بندی‌ی vercel.json صدا می‌زند (هر بار یک
 * batch کوچک — نه کل سایت یک‌جا). برای جلوگیری از فراخوانی عمومی و مصرف
 * بی‌رویه‌ی اعتبار HuggingFace، پشت یک secret مشترک قفل شده.
 *
 * env لازم: CRON_SECRET — یک رشته‌ی تصادفی که هم اینجا و هم در تنظیمات
 * Cron پروژه (Vercel خودش هدر Authorization را با همین مقدار می‌فرستد وقتی
 * CRON_SECRET تنظیم شده باشد) یکی باشد.
 */
export const Route = createFileRoute("/api/cron/crawl")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET?.trim();
        if (secret) {
          const auth = request.headers.get("authorization");
          if (auth !== `Bearer ${secret}`) {
            return Response.json({ error: "unauthorized" }, { status: 401 });
          }
        }
        try {
          const { runCrawlBatch } = await import("@/lib/crawler/run.server");
          const result = await runCrawlBatch(15);
          return Response.json({ ok: true, ...result });
        } catch (err) {
          console.error("crawl tick failed:", err);
          return Response.json(
            { ok: false, error: err instanceof Error ? err.message : "خطای ناشناخته" },
            { status: 500 },
          );
        }
      },
    },
  },
});
