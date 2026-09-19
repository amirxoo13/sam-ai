import { createFileRoute } from "@tanstack/react-router";
import { residencyAskBodySchema } from "@/lib/legal/request-schemas";

const SYSTEM_PROMPT_TEMPLATE = `شما مشاور مهاجرت هوش مصنوعی اها هستید. لحن مؤسسهٔ حقوقی است؛ خطاب «شما».
فقط بر اساس متون رسمی بازیابی‌شده پاسخ دهید. اگر کافی نبود، بگویید در منابع نیست.
حدس نزنید. هر ادعا را به ماده/بخش منبع پیوند دهید.
این پاسخ مشاورهٔ وکیل مجاز کشور مقصد نیست.
{{COUNTRY_CONTEXT}}
متن‌های بازیابی‌شده:
{{RETRIEVED_CHUNKS}}

پرسش:
{{USER_QUESTION}}{{USER_FILES_CONTEXT}}`;

export const Route = createFileRoute("/api/residency-ask")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let sessionUser: { id: string; email: string | null };

        // احراز هویت و گارد ایزولاسیون در بلوک خودشان.
        //
        // قبلاً این دو با `await request.json()` در یک try مشترک بودند و
        // catch آن بدون توجه به نوع خطا «بدنه درخواست باید JSON معتبر باشد»
        // با کد ۴۰۰ برمی‌گرداند. یعنی یک CrossSiteRequestError یا خطای
        // Better Auth هم به‌شکل «JSON بد» گزارش می‌شد — هم پیام غلط، هم
        // پنهان‌شدن کامل خطای واقعی.
        try {
          // SEC-004: این مسیر هم مثل /api/draft گارد same-site نداشت.
          const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
          assertSameSiteRequest();

          const { getSessionUser } = await import("@/lib/auth/verify.server");
          const resolvedUser = await getSessionUser();
          if (!resolvedUser) {
            return Response.json(
              { error: "برای استفاده از این قابلیت باید وارد حساب کاربری خود شوید." },
              { status: 401 },
            );
          }
          sessionUser = resolvedUser;
        } catch (err) {
          const status = (err as { status?: number } | null)?.status === 403 ? 403 : 500;
          const { logAndBuildErrorResponse } = await import("@/lib/server-error");
          return logAndBuildErrorResponse(
            "api/residency-ask",
            err,
            status === 403 ? "درخواست پذیرفته نشد." : "خطای غیرمنتظره در پردازش سؤال",
            status,
          );
        }

        const { consumeRateLimit, rateLimitedResponse, ASK_RATE_LIMIT } = await import(
          "@/lib/rate-limit.server"
        );
        const decision = await consumeRateLimit(`residency-ask:${sessionUser.id}`, ASK_RATE_LIMIT);
        if (!decision.allowed) return rateLimitedResponse(decision);

        let rawBody: unknown;
        try {
          rawBody = await request.json();
        } catch {
          return Response.json({ error: "بدنه درخواست باید JSON معتبر باشد" }, { status: 400 });
        }

        const parsed = residencyAskBodySchema.safeParse(rawBody);
        if (!parsed.success) {
          return Response.json(
            { error: "ورودی نامعتبر است", details: parsed.error.flatten() },
            { status: 400 },
          );
        }
        const question = parsed.data.question;
        const jurisdiction = parsed.data.jurisdiction;
        const rawCountry = parsed.data.country;

        try {
          const { COUNTRY_LABEL_FA } = await import("@/lib/residency/countries");
          const { embedResidencyQuery } = await import("@/lib/residency/embeddings.server");
          const { searchSimilarResidencyDocuments } = await import("@/lib/residency/db.server");
          const { qwenChatStream, rewriteQueryForRetrieval } = await import("@/lib/residency/qwen.server");

          const countryFilter: string | null | undefined =
            rawCountry === "EU_GENERAL" ? null : rawCountry && /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : undefined;
          const countryLabel = rawCountry && rawCountry !== "EU_GENERAL" ? COUNTRY_LABEL_FA[rawCountry] : undefined;

          let retrievalQueries: string[] = [question];
          try {
            retrievalQueries = await rewriteQueryForRetrieval(question);
          } catch (rewriteErr) {
            console.warn("residency-ask: query rewrite failed, using raw Persian text:", rewriteErr);
          }

          const perQueryResults = await Promise.all(
            retrievalQueries.map(async (query) => {
              const embedding = await embedResidencyQuery(query);
              return searchSimilarResidencyDocuments(embedding, 8, { jurisdiction, country: countryFilter });
            }),
          );

          const bestById = new Map<number, (typeof perQueryResults)[number][number]>();
          for (const results of perQueryResults) {
            for (const doc of results) {
              const existing = bestById.get(doc.id);
              if (!existing || (doc.distance ?? Infinity) < (existing.distance ?? Infinity)) {
                bestById.set(doc.id, doc);
              }
            }
          }
          const retrievedDocs = Array.from(bestById.values())
            .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
            .slice(0, 10);

          const chunksText =
            retrievedDocs.length === 0
              ? "(هیچ سند مرتبطی در پایگاه داده پیدا نشد)"
              : retrievedDocs
                  .map((doc, i) => {
                    const ref = doc.section_reference || doc.title || "منبع نامشخص";
                    const countryTag = doc.country ? ` — کشور: ${doc.country}` : "";
                    return `[سند ${i + 1} — ${ref}${countryTag}]\n${doc.full_text}`;
                  })
                  .join("\n\n---\n\n");

          const countryContext = countryLabel
            ? `\nکاربر گفته کشور موردنظرش «${countryLabel}» است — اگر منبع پیدا‌شده مربوط به کشور دیگری بود، این را شفاف بگو.\n`
            : "";

          const { getUserFilesContext } = await import("@/lib/user-files.server");
          const userFilesContext = await getUserFilesContext(sessionUser.id, question).catch((err) => {
            console.warn("[api/residency-ask] user file context unavailable", err);
            return "";
          });
          const userFilesBlock = userFilesContext
            ? `\n\nپرونده(های) خصوصی این کاربر (فقط اگر مرتبط بود استفاده کن):\n${userFilesContext}`
            : "";

          const prompt = SYSTEM_PROMPT_TEMPLATE.replace("{{COUNTRY_CONTEXT}}", countryContext)
            .replace("{{RETRIEVED_CHUNKS}}", chunksText)
            .replace("{{USER_QUESTION}}", question)
            .replace("{{USER_FILES_CONTEXT}}", userFilesBlock);

          const { saveChatMessage } = await import("@/lib/chat-history.server");
          await saveChatMessage(sessionUser.id, "residency", "user", question);

          const upstream = await qwenChatStream([{ role: "system", content: prompt }]);
          const decoder = new TextDecoder();
          let answerBuffer = "";
          let lineTail = "";
          const loggedStream = new ReadableStream<Uint8Array>({
            async start(controller) {
              const reader = upstream.getReader();
              let closed = false;
              const closeOnce = () => {
                if (closed) return;
                closed = true;
                controller.close();
              };
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  controller.enqueue(value);
                  lineTail += decoder.decode(value, { stream: true });
                  const lines = lineTail.split("\n");
                  lineTail = lines.pop() ?? "";
                  for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                      const parsedLine = JSON.parse(line);
                      if (parsedLine.t === "c" && typeof parsedLine.d === "string") {
                        answerBuffer += parsedLine.d;
                      }
                    } catch {
                      /* خط NDJSON ناقص — قطعهٔ بعدی کاملش می‌کند */
                    }
                  }
                }
              } catch (streamErr) {
                // بدون این، خطای upstream از داخل start() بیرون می‌زد در حالی
                // که finally هم‌زمان controller را می‌بست.
                console.error("[api/residency-ask] upstream stream failed", streamErr);
              } finally {
                reader.releaseLock();
                closeOnce();
                if (answerBuffer.trim()) {
                  // نوشتن تاریخچه نباید بتواند یک unhandled rejection بسازد.
                  await saveChatMessage(
                    sessionUser.id,
                    "residency",
                    "assistant",
                    answerBuffer,
                  ).catch((saveErr) => {
                    console.error("[api/residency-ask] saveChatMessage failed", saveErr);
                  });
                }
              }
            },
          });

          return new Response(loggedStream, {
            headers: {
              "Content-Type": "application/x-ndjson; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
            },
          });
        } catch (err) {
          const { logAndBuildErrorResponse } = await import("@/lib/server-error");
          return logAndBuildErrorResponse(
            "api/residency-ask",
            err,
            "خطای غیرمنتظره در پردازش سؤال",
          );
        }
      },
    },
  },
});
