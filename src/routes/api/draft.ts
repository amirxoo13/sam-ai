import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { DRAFT_DISCLAIMER } from "@/lib/legal/copy";

const bodySchema = z.object({
  story: z.string().trim().min(8).max(8000),
  formId: z.string().trim().max(80).optional(),
  answers: z.record(z.string(), z.string()).optional(),
  hasJudgment: z.boolean().optional(),
});

export const Route = createFileRoute("/api/draft")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { getSessionUser } = await import("@/lib/auth/verify.server");
          const sessionUser = await getSessionUser();
          if (!sessionUser) {
            return Response.json(
              { error: "برای استفاده از این قابلیت باید وارد حساب کاربری خود شوید." },
              { status: 401 },
            );
          }
          const json: unknown = await request.json();
          const parsed = bodySchema.safeParse(json);
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
          const { logAndBuildErrorResponse } = await import("@/lib/server-error");
          return logAndBuildErrorResponse("api/draft", err, "خطای غیرمنتظره در تولید پیش‌نویس");
        }
      },
    },
  },
});
