import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const SYSTEM_PROMPT_TEMPLATE = `شما مشاور مهاجرت SAM AI هستید. لحن مؤسسهٔ حقوقی است؛ خطاب «شما».
فقط بر اساس متون رسمی بازیابی‌شده پاسخ دهید. اگر کافی نبود، بگویید در منابع نیست.
حدس نزنید. هر ادعا را به ماده/بخش منبع پیوند دهید.
این پاسخ مشاورهٔ وکیل مجاز کشور مقصد نیست.
{{COUNTRY_CONTEXT}}
متن‌های بازیابی‌شده:
{{RETRIEVED_CHUNKS}}

پرسش:
{{USER_QUESTION}}{{USER_FILES_CONTEXT}}`;

/**
 * سقف طول ورودی همسان با `/api/ask` و `/api/legal-ask` است. بدون سقف، متن
 * دلخواه بزرگ مستقیم به rewrite + embedding + prompt مدل می‌رفت و سهمیه را
 * می‌سوزاند (BUG-003).
 */
const bodySchema = z.object({
  question: z.string().trim().min(4).max(2000),
  jurisdiction: z.enum(["US", "EU"]).optional(),
  country: z.string().trim().max(20).optional(),
});

export const Route = createFileRoute("/api/residency-ask")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let rawBody: unknown;
        let sessionUser: { id: string; email: string | null };
        try {
          const { getSessionUser } = await import("@/lib/auth/verify.server");
          const resolvedUser = await getSessionUser();
          if (!resolvedUser) {
            return Response.json(
              { error: "برای استفاده از این قابلیت باید وارد حساب کاربری خود شوید." },
              { status: 401 },
            );
          }
          sessionUser = resolvedUser;
          rawBody = await request.json();
        } catch {
          return Response.json({ error: "بدنه درخواست باید JSON معتبر باشد" }, { status: 400 });
        }

        const parsed = bodySchema.safeParse(rawBody);
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
          const userFilesContext = await getUserFilesContext(sessionUser.id, question).catch(() => "");
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
                      const parsed = JSON.parse(line);
                      if (parsed.t === "c" && typeof parsed.d === "string") answerBuffer += parsed.d;
                    } catch {
                      /* نادیده گرفته می‌شود */
                    }
                  }
                }
              } finally {
                controller.close();
                if (answerBuffer.trim()) {
                  await saveChatMessage(sessionUser.id, "residency", "assistant", answerBuffer);
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
