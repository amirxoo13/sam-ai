import { createFileRoute } from "@tanstack/react-router";
import { askBodySchema } from "@/lib/legal/request-schemas";

export const Route = createFileRoute("/api/legal-ask")({
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
          const decision = await consumeRateLimit(`legal-ask:${sessionUser.id}`, ASK_RATE_LIMIT);
          if (!decision.allowed) return rateLimitedResponse(decision);

          const parsed = askBodySchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json({ error: "پرسش نامعتبر است" }, { status: 400 });
          }
          const encoder = new TextEncoder();
          const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
              const send = (obj: unknown) => {
                controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
              };
              try {
                const { resolveMatterForUser, retrieveMatterExcerpts } = await import(
                  "@/lib/matter.server"
                );
                const matter = await resolveMatterForUser(sessionUser.id, parsed.data.matterId);
                const excerpts = await retrieveMatterExcerpts(
                  sessionUser.id,
                  matter.id,
                  parsed.data.question,
                ).catch((err) => {
                  console.warn("[api/legal-ask] matter excerpt retrieval failed", err);
                  return "";
                });
                const { runAskStream } = await import("@/lib/legal/ask.server");
                const result = await runAskStream({
                  question: parsed.data.question,
                  sourceType: parsed.data.sourceType ?? "all",
                  matterExcerpts: excerpts || undefined,
                  userId: sessionUser.id,
                  onSources: (sources) => send({ t: "sources", sources }),
                  onDelta: (d) => send({ t: "c", d }),
                });
                const { saveChatMessage } = await import("@/lib/chat-history.server");
                await saveChatMessage(
                  sessionUser.id,
                  "legal",
                  "user",
                  parsed.data.question,
                  matter.id,
                  result.requestId,
                );
                await saveChatMessage(
                  sessionUser.id,
                  "legal",
                  "assistant",
                  result.answer,
                  matter.id,
                  result.requestId,
                );
                send({
                  t: "done",
                  requestId: result.requestId,
                  unverifiedCites: result.unverifiedCites,
                  usedFallback: result.usedFallback,
                  sources: result.sources,
                  eval: result.eval,
                });
              } catch (err) {
                // پیش‌تر فقط `void err` بود: کاربر پیام خطا می‌دید ولی هیچ
                // چیزی در لاگ سرور نمی‌نشست، پس خرابی مسیر جریانی
                // عملاً غیرقابل عیب‌یابی بود.
                console.error("[api/legal-ask] stream handler failed", err);
                send({
                  t: "error",
                  error: "پاسخ در حال حاضر آماده نشد. لطفاً دوباره تلاش کنید.",
                });
              } finally {
                controller.close();
              }
            },
          });
          return new Response(stream, {
            headers: {
              "Content-Type": "application/x-ndjson; charset=utf-8",
              "Cache-Control": "no-store",
            },
          });
        } catch (err) {
          const status = (err as { status?: number } | null)?.status === 403 ? 403 : 500;
          const { logAndBuildErrorResponse } = await import("@/lib/server-error");
          return logAndBuildErrorResponse("api/legal-ask", err, "درخواست پذیرفته نشد.", status);
        }
      },
    },
  },
});
