import { createFileRoute } from "@tanstack/react-router";
import { LEGAL_DISCLAIMER } from "@/lib/legal/config";
import { askBodySchema } from "@/lib/legal/request-schemas";

export const Route = createFileRoute("/api/ask")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
          assertSameSiteRequest();
          const { getSessionUser } = await import("@/lib/auth/verify.server");
          const sessionUser = await getSessionUser();
          if (!sessionUser) {
            return Response.json(
              { error: "برای استفاده از این قابلیت باید وارد حساب کاربری خود شوید." },
              { status: 401 },
            );
          }

          const { consumeRateLimit, rateLimitedResponse, ASK_RATE_LIMIT } = await import(
            "@/lib/rate-limit.server"
          );
          const decision = await consumeRateLimit(`ask:${sessionUser.id}`, ASK_RATE_LIMIT);
          if (!decision.allowed) return rateLimitedResponse(decision);

          const parsed = askBodySchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json({ error: "پرسش نامعتبر است" }, { status: 400 });
          }
          const { resolveMatterForUser, retrieveMatterExcerpts } = await import(
            "@/lib/matter.server"
          );
          const matter = await resolveMatterForUser(sessionUser.id, parsed.data.matterId);
          const excerpts = await retrieveMatterExcerpts(
            sessionUser.id,
            matter.id,
            parsed.data.question,
          ).catch((err) => {
            console.warn("[api/ask] matter excerpt retrieval failed", err);
            return "";
          });
          const { runAsk } = await import("@/lib/legal/ask.server");
          const result = await runAsk({
            question: parsed.data.question,
            sourceType: parsed.data.sourceType ?? "all",
            matterExcerpts: excerpts || undefined,
            userId: sessionUser.id,
          });
          return Response.json({ ...result, disclaimer: LEGAL_DISCLAIMER });
        } catch (err) {
          // قبلاً `catch {}` خالی بود: هر خطایی — از جمله
          // CrossSiteRequestError که باید ۴۰۳ می‌شد — به یک ۵۰۰ِ بی‌نشان
          // تبدیل می‌شد و هیچ ردی در لاگ نمی‌ماند.
          const status = (err as { status?: number } | null)?.status === 403 ? 403 : 500;
          const { logAndBuildErrorResponse } = await import("@/lib/server-error");
          return logAndBuildErrorResponse(
            "api/ask",
            err,
            status === 403 ? "درخواست پذیرفته نشد." : "پاسخ در حال حاضر آماده نشد.",
            status,
          );
        }
      },
    },
  },
});
