import { EMBEDDING_MODEL } from "./config";
import { generateAnswer, QWEN_MODEL } from "./qwen.server";
import { retrieveChunks } from "./retrieve.server";
import type { AskResult, RetrievedChunk, SourceFilter } from "./types";

function fallbackFromSources(question: string, chunks: RetrievedChunk[]): string {
  const body = chunks
    .map((c, i) => {
      const art = c.article_number
        ? ` — ${c.source_title?.includes("اساسی") ? "اصل" : "ماده"} ${c.article_number}`
        : "";
      return `منبع ${i + 1}: ${c.source_title || "بدون عنوان"}${art}\n${c.content.slice(0, 900)}`;
    })
    .join("\n\n---\n\n");
  return [
    `نزدیک‌ترین متن‌های پیکره برای «${question.slice(0, 80)}» بازیابی شد، اما مدل تولید پاسخ در دسترس نبود. خلاصهٔ منابع:`,
    "",
    body,
    "",
    "این گزیده جایگزین مشاوره نیست؛ متن کامل قانون را در منبع رسمی مقابله کنید.",
  ].join("\n");
}

export async function runAsk(input: {
  question: string;
  sourceType?: SourceFilter;
}): Promise<AskResult> {
  const sourceType: SourceFilter = input.sourceType ?? "all";
  const sources = await retrieveChunks(input.question, sourceType);
  if (sources.length === 0) {
    return {
      answer:
        "در پیکرهٔ حقوقی بارگذاری‌شده منبعی نزدیک به این پرسش پیدا نشد. پرسش را با نام قانون یا شماره ماده دقیق‌تر کنید.",
      sources: [],
      usedFallback: true,
      model: QWEN_MODEL,
      embeddingModel: EMBEDDING_MODEL,
      retrieved: 0,
    };
  }
  try {
    const answer = await generateAnswer(input.question, sources);
    return {
      answer,
      sources,
      usedFallback: false,
      model: QWEN_MODEL,
      embeddingModel: EMBEDDING_MODEL,
      retrieved: sources.length,
    };
  } catch {
    return {
      answer: fallbackFromSources(input.question, sources),
      sources,
      usedFallback: true,
      model: QWEN_MODEL,
      embeddingModel: EMBEDDING_MODEL,
      retrieved: sources.length,
    };
  }
}
