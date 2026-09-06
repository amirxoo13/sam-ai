import { createFileRoute } from "@tanstack/react-router";

const SYSTEM_PROMPT_TEMPLATE = `تو «سام»، دستیار حقوقی SAMAI هستی — یک متخصص باتجربه‌ی قوانین مهاجرت اروپا
و آمریکا که با کاربرش مثل یک دوست دلسوز و آگاه حرف می‌زند، نه مثل یک ربات
رسمی یا یک متن قانونی خشک.

فقط بر اساس متن‌های زیر (که از منابع رسمی بازیابی شده‌اند) جواب بده. اگر
اطلاعات کافی نبود، صادقانه و صمیمی بگو که این بخش خاص را در منابعت پیدا
نکردی — و اگر بخشی نزدیک ولی نه دقیقاً منطبق پیدا کردی، همان‌جا بگو که
مطمئن نیستی دقیقاً برای وضعیت او صدق می‌کند یا نه. هرگز حدس نزن و هرگز
چیزی را که در متن‌ها نیست به‌عنوان قطعیت جا نزن.

لحن: عامیانه، گرم و دوستانه؛ زیر هر ادعا طبیعی و در دل جمله به ماده/بخش
قانونی منبع اشاره کن. پاسخ را با ساختار خوانا (تیتر، بولت در صورت نیاز)
سازمان بده، ولی حس گفت‌وگو را حفظ کن.
{{COUNTRY_CONTEXT}}
متن‌های بازیابی‌شده:
{{RETRIEVED_CHUNKS}}

سؤال کاربر: {{USER_QUESTION}}`;

interface ChatRequestBody {
  question?: string;
  jurisdiction?: "US" | "EU";
  country?: string;
}

export const Route = createFileRoute("/api/residency-ask")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ChatRequestBody;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "بدنه درخواست باید JSON معتبر باشد" }, { status: 400 });
        }

        const question = body.question?.trim();
        if (!question) {
          return Response.json({ error: "فیلد question الزامی است" }, { status: 400 });
        }
        const jurisdiction = body.jurisdiction === "US" || body.jurisdiction === "EU" ? body.jurisdiction : undefined;
        const rawCountry = body.country?.trim();

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

          const prompt = SYSTEM_PROMPT_TEMPLATE.replace("{{COUNTRY_CONTEXT}}", countryContext)
            .replace("{{RETRIEVED_CHUNKS}}", chunksText)
            .replace("{{USER_QUESTION}}", question);

          const stream = await qwenChatStream([{ role: "system", content: prompt }]);
          return new Response(stream, {
            headers: {
              "Content-Type": "application/x-ndjson; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
            },
          });
        } catch (err) {
          console.error("خطا در پردازش /api/residency-ask:", err);
          const message = err instanceof Error ? err.message : "خطای غیرمنتظره در پردازش سؤال";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
