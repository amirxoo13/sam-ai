import { createFileRoute } from "@tanstack/react-router";
import { DRAFT_DISCLAIMER } from "@/lib/legal/copy";
import { draftApiBodySchema } from "@/lib/legal/request-schemas";

export const Route = createFileRoute("/api/draft")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // SEC-004: این گارد روی `/api/ask` و `/api/legal-ask` بود ولی اینجا جا
          // افتاده بود. کوکیِ سشن `SameSite=Lax` روی درخواست‌های same-site
          // فرستاده می‌شود، پس یک اپ دیگر روی همین site می‌توانست با fetch
          // سوار سشنِ کاربر این اپ شود و پیش‌نویس تولید کند.
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

          const { consumeRateLimit, rateLimitedResponse, DRAFT_RATE_LIMIT } = await import(
            "@/lib/rate-limit.server"
          );
          const decision = await consumeRateLimit(`draft:${sessionUser.id}`, DRAFT_RATE_LIMIT);
          if (!decision.allowed) return rateLimitedResponse(decision);

          const json: unknown = await request.json();
          const parsed = draftApiBodySchema.safeParse(json);
          if (!parsed.success) {
            return Response.json(
              { error: "ورودی نامعتبر است", details: parsed.error.flatten() },
              { status: 400 },
            );
          }
          const { runDraft } = await import("@/lib/legal/draft.server");
          const result = await runDraft(parsed.data);
          return Response.json({ ...result, disclaimer: DRAFT_DISCLAIMER });
        } catch (err) {
          const status = (err as { status?: number } | null)?.status === 403 ? 403 : 500;
          const { logAndBuildErrorResponse } = await import("@/lib/server-error");
          return logAndBuildErrorResponse(
            "api/draft",
            err,
            status === 403 ? "درخواست پذیرفته نشد." : "خطای غیرمنتظره در تولید پیش‌نویس",
            status,
          );
        }
      },
    },
  },
});
