import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LEGAL_DISCLAIMER } from "@/lib/legal/config";

const bodySchema = z.object({
  question: z.string().trim().min(4).max(2000),
  sourceType: z
    .enum(["all", "statute", "case_law", "convention", "advisory_opinion", "terminology"])
    .optional(),
  matterId: z.string().uuid().optional(),
});

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
          const parsed = bodySchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json({ error: "پرسش نامعتبر است" }, { status: 400 });
          }
          const { getOrCreateDefaultMatter, assertMatterOwner, retrieveMatterExcerpts } =
            await import("@/lib/matter.server");
          const matter = parsed.data.matterId
            ? (await assertMatterOwner(sessionUser.id, parsed.data.matterId))
              ? { id: parsed.data.matterId }
              : await getOrCreateDefaultMatter(sessionUser.id)
            : await getOrCreateDefaultMatter(sessionUser.id);
          const excerpts = await retrieveMatterExcerpts(
            sessionUser.id,
            matter.id,
            parsed.data.question,
          ).catch(() => "");
          const { runAsk } = await import("@/lib/legal/ask.server");
          const result = await runAsk({
            question: parsed.data.question,
            sourceType: parsed.data.sourceType ?? "all",
            matterExcerpts: excerpts || undefined,
            userId: sessionUser.id,
          });
          return Response.json({ ...result, disclaimer: LEGAL_DISCLAIMER });
        } catch {
          return Response.json({ error: "پاسخ در حال حاضر آماده نشد." }, { status: 500 });
        }
      },
    },
  },
});
