import { QWEN_BASE_URL, QWEN_MODEL } from "./config";
import { qwenApiKey } from "./secrets.server";
import type { RetrievedChunk } from "./types";

function formatSources(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "هیچ منبعی بازیابی نشد.";
  return chunks
    .map((c, i) => {
      const title = c.source_title || "منبع بدون عنوان";
      const art = c.article_number ? ` — ماده ${c.article_number}` : "";
      const date = c.law_date ? ` (${c.law_date})` : "";
      const kind = c.source_type === "statute" ? "قانون موضوعه" : "رأی / رویه قضایی";
      return `[منبع ${i + 1} | ${kind} | ${title}${art}${date}]\n${c.content}`;
    })
    .join("\n\n---\n\n");
}

export function buildLegalPrompt(question: string, chunks: RetrievedChunk[]): {
  system: string;
  user: string;
} {
  const system = [
    "تو دستیار حقوقی SAM AI هستی که فقط بر اساس متن منابع داده‌شده پاسخ می‌دهی.",
    "قواعد سخت:",
    "1) فقط از متن منابع زیر استفاده کن. دانش قبلی خودت را به‌جای قانون جا نزن.",
    "2) اگر منابع برای پاسخ کافی نیستند، صادقانه بگو اطلاعات کافی در پیکره موجود نیست.",
    "3) هر ادعای حقوقی را با ارجاع دقیق همراه کن: نام قانون/رأی و شماره ماده در صورت وجود.",
    "4) وزن حقوقی قانون موضوعه بالاتر از رأی است؛ اگر هر دو هست، تمایز بده.",
    "5) پاسخ را به فارسی روان، منظم و با تیترهای کوتاه بنویس.",
    "6) مشاوره قضایی شخصی صادر نکن و حکم قطعی نده.",
  ].join("\n");

  const user = `سؤال کاربر:\n${question}\n\nمنابع بازیابی‌شده:\n${formatSources(chunks)}`;
  return { system, user };
}

export async function generateAnswer(
  question: string,
  chunks: RetrievedChunk[],
): Promise<string> {
  const { system, user } = buildLegalPrompt(question, chunks);
  const res = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${qwenApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: QWEN_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 1400,
      temperature: 0.2,
      enable_thinking: false,
    }),
  });
  const json: {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  } = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Qwen HTTP ${res.status}: ${json.error?.message || JSON.stringify(json).slice(0, 400)}`,
    );
  }
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("پاسخ خالی از مدل تولید متن");
  return content;
}

export { QWEN_MODEL };
