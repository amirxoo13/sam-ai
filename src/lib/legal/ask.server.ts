import { EMBEDDING_MODEL } from "./config";
import { generateAnswer, QWEN_MODEL, streamAnswer } from "./qwen.server";
import { retrieveChunks } from "./retrieve.server";
import { toPublicCitations, verifyCitations } from "./cite";
import { evaluateAnswer, evaluateRetrieval } from "./eval";
import { newRequestId, writeAudit } from "./audit.server";
import type { AskEval, AskResult, PublicCitation, RetrievedChunk, SourceFilter } from "./types";
import { LEGAL_DISCLAIMER } from "./copy";

function fallbackFromSources(question: string, chunks: RetrievedChunk[]): string {
  const body = chunks
    .map((c, i) => {
      const art = c.article_number
        ? ` — ${c.source_title?.includes("اساسی") ? "اصل" : "ماده"} ${c.article_number}`
        : "";
      return `منبع ${i + 1} (${c.authority.shortFa}): ${c.source_title || "بدون عنوان"}${art}`;
    })
    .join("\n");
  return [
    `نزدیک‌ترین منابع پیکره برای پرسش بازیابی شد، اما مدل تولید پاسخ در دسترس نبود.`,
    "",
    body,
    "",
    "متن کامل را در نشانی رسمی هر منبع مقابله کنید. این فهرست جایگزین مشاوره نیست.",
    LEGAL_DISCLAIMER,
  ].join("\n");
}

function packEval(answer: string, chunks: RetrievedChunk[]): AskEval {
  return {
    retrieval: evaluateRetrieval(chunks),
    answer: evaluateAnswer(answer, chunks),
  };
}

function emptyResult(requestId: string, answer: string): AskResult {
  return {
    answer,
    sources: [],
    usedFallback: true,
    model: QWEN_MODEL,
    embeddingModel: EMBEDDING_MODEL,
    retrieved: 0,
    requestId,
    unverifiedCites: [],
    eval: packEval(answer, []),
  };
}

export async function runAsk(input: {
  question: string;
  sourceType?: SourceFilter;
  matterExcerpts?: string;
  userId?: string;
}): Promise<AskResult> {
  const requestId = newRequestId();
  const sourceType: SourceFilter = input.sourceType ?? "all";
  const sources = await retrieveChunks(input.question, sourceType);
  if (sources.length === 0) {
    const result = emptyResult(
      requestId,
      "در پیکرهٔ بارگذاری‌شده منبعی نزدیک به این پرسش پیدا نشد. پرسش را با نام قانون و شماره ماده دقیق‌تر کنید.",
    );
    if (input.userId) {
      await writeAudit({
        requestId,
        userId: input.userId,
        question: input.question,
        chunks: [],
        cited: [],
        unverified: [],
        usedFallback: true,
        model: QWEN_MODEL,
        eval: result.eval,
      });
    }
    return result;
  }

  let answer: string;
  let usedFallback = false;
  try {
    answer = await generateAnswer(input.question, sources, input.matterExcerpts);
  } catch {
    answer = fallbackFromSources(input.question, sources);
    usedFallback = true;
  }
  const { verified, unverified } = verifyCitations(answer, sources);
  if (unverified.length > 0 && !usedFallback) {
    answer += `\n\nتوجه: این ارجاع‌ها در منابع بازیابی‌شده پیدا نشد و نباید مبنای اقدام قرار گیرد: ${unverified.map((c) => c.raw).join("، ")}.`;
  }
  const evalReport = packEval(answer, sources);
  if (input.userId) {
    await writeAudit({
      requestId,
      userId: input.userId,
      question: input.question,
      chunks: sources,
      cited: verified,
      unverified,
      usedFallback,
      model: QWEN_MODEL,
      eval: evalReport,
    });
  }
  return {
    answer,
    sources: toPublicCitations(sources, unverified),
    usedFallback,
    model: QWEN_MODEL,
    embeddingModel: EMBEDDING_MODEL,
    retrieved: sources.length,
    requestId,
    unverifiedCites: unverified.map((c) => c.raw),
    eval: evalReport,
  };
}

export async function runAskStream(input: {
  question: string;
  sourceType?: SourceFilter;
  matterExcerpts?: string;
  userId: string;
  onSources: (sources: PublicCitation[]) => void;
  onDelta: (text: string) => void;
}): Promise<AskResult> {
  const requestId = newRequestId();
  const sourceType: SourceFilter = input.sourceType ?? "all";
  const chunks = await retrieveChunks(input.question, sourceType);
  input.onSources(toPublicCitations(chunks, []));
  if (chunks.length === 0) {
    const answer =
      "در پیکرهٔ بارگذاری‌شده منبعی نزدیک به این پرسش پیدا نشد. پرسش را با نام قانون و شماره ماده دقیق‌تر کنید.";
    input.onDelta(answer);
    const result = emptyResult(requestId, answer);
    await writeAudit({
      requestId,
      userId: input.userId,
      question: input.question,
      chunks: [],
      cited: [],
      unverified: [],
      usedFallback: true,
      model: QWEN_MODEL,
      eval: result.eval,
    });
    return result;
  }
  let answer: string;
  let usedFallback = false;
  try {
    answer = await streamAnswer(input.question, chunks, input.matterExcerpts, input.onDelta);
  } catch {
    answer = fallbackFromSources(input.question, chunks);
    usedFallback = true;
    input.onDelta(answer);
  }
  const { verified, unverified } = verifyCitations(answer, chunks);
  if (unverified.length > 0 && !usedFallback) {
    const note = `\n\nتوجه: این ارجاع‌ها در منابع بازیابی‌شده پیدا نشد و نباید مبنای اقدام قرار گیرد: ${unverified.map((c) => c.raw).join("، ")}.`;
    answer += note;
    input.onDelta(note);
  }
  const evalReport = packEval(answer, chunks);
  await writeAudit({
    requestId,
    userId: input.userId,
    question: input.question,
    chunks,
    cited: verified,
    unverified,
    usedFallback,
    model: QWEN_MODEL,
    eval: evalReport,
  });
  return {
    answer,
    sources: toPublicCitations(chunks, unverified),
    usedFallback,
    model: QWEN_MODEL,
    embeddingModel: EMBEDDING_MODEL,
    retrieved: chunks.length,
    requestId,
    unverifiedCites: unverified.map((c) => c.raw),
    eval: evalReport,
  };
}
