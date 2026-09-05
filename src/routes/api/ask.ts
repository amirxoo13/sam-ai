import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LEGAL_DISCLAIMER } from "@/lib/legal/config";

const bodySchema = z.object({
  question: z.string().trim().min(4).max(2000),
  sourceType: z.enum(["all", "statute", "case_law"]).optional(),
});

export const Route = createFileRoute("/api/ask")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { checkRateLimit, rateLimitResponse } = await import(
            "@/lib/legal/rate-limit.server"
          );
          const limit = await checkRateLimit(request, "ask");
          if (!limit.allowed) return rateLimitResponse(limit);

          const json: unknown = await request.json();
          const parsed = bodySchema.safeParse(json);
          if (!parsed.success) {
            return Response.json(
              { error: "پرسش نامعتبر است", details: parsed.error.flatten() },
              { status: 400 },
            );
          }
          const { runAsk } = await import("@/lib/legal/ask.server");
          const result = await runAsk({
            question: parsed.data.question,
            sourceType: parsed.data.sourceType ?? "all",
          });
          return Response.json({ ...result, disclaimer: LEGAL_DISCLAIMER });
        } catch (err) {
          const message = err instanceof Error ? err.message : "خطای ناشناخته";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
