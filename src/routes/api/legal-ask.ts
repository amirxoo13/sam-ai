import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  question: z.string().trim().min(4).max(2000),
  sourceType: z
    .enum(["all", "statute", "case_law", "convention", "advisory_opinion", "terminology"])
    .optional(),
  matterId: z.string().uuid().optional(),
});

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
          const parsed = bodySchema.safeParse(await request.json());
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
                send({
                  t: "error",
                  error: "پاسخ در حال حاضر آماده نشد. لطفاً دوباره تلاش کنید.",
                });
                void err;
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
          const status = (err as { status?: number }).status === 403 ? 403 : 500;
          return Response.json({ error: "درخواست پذیرفته نشد." }, { status });
        }
      },
    },
  },
});
