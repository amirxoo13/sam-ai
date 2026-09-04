import { EMBEDDING_MODEL } from "./config";
import { generateAnswer, QWEN_MODEL } from "./qwen.server";
import { retrieveChunks } from "./retrieve.server";
import type { AskResult, SourceFilter } from "./types";

export async function runAsk(input: {
  question: string;
  sourceType?: SourceFilter;
}): Promise<AskResult> {
  const sourceType: SourceFilter = input.sourceType ?? "all";
  const sources = await retrieveChunks(input.question, sourceType);
  if (sources.length === 0) {
    return {
      answer:
        "در پیکرهٔ حقوقی بارگذاری‌شده منبعی نزدیک به این پرسش پیدا نشد. یا دسترسی به قوانین موضوعه (legal_full_v4) هنوز باز نشده، یا پرسش خارج از متون موجود است.",
      sources: [],
      usedFallback: true,
      model: QWEN_MODEL,
      embeddingModel: EMBEDDING_MODEL,
      retrieved: 0,
    };
  }
  const answer = await generateAnswer(input.question, sources);
  return {
    answer,
    sources,
    usedFallback: false,
    model: QWEN_MODEL,
    embeddingModel: EMBEDDING_MODEL,
    retrieved: sources.length,
  };
}
