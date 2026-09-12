import { qwenApiKey } from "@/lib/legal/secrets.server";
import { RESIDENCY_QWEN_BASE_URL, RESIDENCY_QWEN_MODEL } from "./config";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const QWEN_FETCH_TIMEOUT_MS = 25_000;

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/** برای گام داخلی/نامرئی بازنویسی کوئری — reasoning_effort="none" چون سرعت مهم‌تر از عمق فکرکردن است. */
export async function qwenChat(messages: ChatMessage[], options: { temperature?: number } = {}): Promise<string> {
  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${RESIDENCY_QWEN_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${qwenApiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: RESIDENCY_QWEN_MODEL,
          messages,
          temperature: options.temperature ?? 0.3,
          reasoning_effort: "none",
        }),
      },
      QWEN_FETCH_TIMEOUT_MS,
    );
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`مدل تولید پاسخ پس از ${QWEN_FETCH_TIMEOUT_MS / 1000} ثانیه پاسخ نداد.`);
    }
    throw err;
  }
  if (!res.ok) {
    throw new Error(`مدل تولید پاسخ در دسترس نبود (${res.status})`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("پاسخ خالی از مدل تولید متن");
  }
  return content;
}

/**
 * استریم فقط متن نهایی — زنجیرهٔ فکر به مشتری فرستاده نمی‌شود.
 */
export async function qwenChatStream(
  messages: ChatMessage[],
  options: { temperature?: number } = {},
): Promise<ReadableStream<Uint8Array>> {
  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${RESIDENCY_QWEN_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${qwenApiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: RESIDENCY_QWEN_MODEL,
          messages,
          temperature: options.temperature ?? 0.3,
          stream: true,
          reasoning_effort: "none",
        }),
      },
      QWEN_FETCH_TIMEOUT_MS,
    );
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`مدل تولید پاسخ پس از ${QWEN_FETCH_TIMEOUT_MS / 1000} ثانیه آغاز نشد.`);
    }
    throw err;
  }
  if (!res.ok) {
    throw new Error(`مدل تولید پاسخ در دسترس نبود (${res.status})`);
  }
  if (!res.body) {
    throw new Error("پاسخ استریم بدنه‌ای نداشت");
  }

  const upstreamReader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  function emit(controller: ReadableStreamDefaultController<Uint8Array>, text: string) {
    controller.enqueue(encoder.encode(JSON.stringify({ t: "c", d: text }) + "\n"));
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await upstreamReader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          const contentDelta = json?.choices?.[0]?.delta?.content;
          if (typeof contentDelta === "string" && contentDelta.length > 0) {
            emit(controller, contentDelta);
          }
        } catch {
          /* خط ناقص */
        }
      }
    },
    cancel() {
      upstreamReader.cancel();
    },
  });
}

const QUERY_REWRITE_SYSTEM_PROMPT = `You rewrite a user's Persian immigration-law question into 2-3 short English
search phrases using the EXACT formal statutory/regulatory terminology that
would literally appear in the text of immigration regulations, statutes, or
case law — NOT colloquial terms and NOT a literal translation for a human
reader. Avoid the phrase "green card" entirely; use the precise legal term
instead. Output ONLY the phrases, one per line, nothing else.`;

export async function rewriteQueryForRetrieval(persianQuestion: string): Promise<string[]> {
  const raw = await qwenChat(
    [
      { role: "system", content: QUERY_REWRITE_SYSTEM_PROMPT },
      { role: "user", content: persianQuestion },
    ],
    { temperature: 0.1 },
  );
  const phrases = raw
    .split("\n")
    .map((line) => line.trim().replace(/^[\d.\-)\s]+/, "").replace(/^["'«]|["'»]$/g, ""))
    .filter(Boolean);
  if (phrases.length === 0) {
    throw new Error("بازنویسی کوئری چیزی برنگرداند");
  }
  return phrases;
}
