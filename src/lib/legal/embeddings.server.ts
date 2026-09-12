import { EMBEDDING_DIM, EMBEDDING_MODEL, HF_EMBED_URL } from "./config";
import { huggingfaceToken } from "./secrets.server";

const EMBED_TIMEOUT_MS = 20_000;

function asVectors(json: unknown): number[][] {
  if (!Array.isArray(json)) {
    throw new Error("پاسخ embedding آرایه نبود");
  }
  if (json.length === 0) return [];
  if (typeof json[0] === "number") {
    if (json.length !== EMBEDDING_DIM) {
      throw new Error(`بعد بردار ${json.length} است نه ${EMBEDDING_DIM}`);
    }
    return [l2normalize(json.map(Number))];
  }
  return json.map((row) => {
    if (!Array.isArray(row) || row.length !== EMBEDDING_DIM) {
      throw new Error(
        `بعد بردار ${Array.isArray(row) ? row.length : typeof row} است نه ${EMBEDDING_DIM}`,
      );
    }
    return l2normalize(row.map(Number));
  });
}

export function l2normalize(vec: number[]): number[] {
  let sum = 0;
  for (const x of vec) sum += x * x;
  const n = Math.sqrt(sum);
  if (!n) return vec;
  return vec.map((x) => x / n);
}

async function embedOnce(texts: string[], kind: "query" | "passage"): Promise<number[][]> {
  const inputs = texts.map((t) => `${kind}: ${t.slice(0, 1800)}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMBED_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(HF_EMBED_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${huggingfaceToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs, wait_for_model: true }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`زمان انتظار embedding به پایان رسید (${EMBED_TIMEOUT_MS / 1000}ثانیه)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Hugging Face embed HTTP ${res.status}`);
  }
  const vecs = asVectors(json);
  if (vecs.length !== texts.length) {
    throw new Error(`تعداد بردار ${vecs.length} با ورودی ${texts.length} نمی‌خواند`);
  }
  return vecs;
}

export async function embedTexts(
  texts: string[],
  kind: "query" | "passage",
): Promise<number[][]> {
  if (texts.length === 0) return [];
  let last: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await embedOnce(texts, kind);
    } catch (err) {
      last = err instanceof Error ? err : new Error(String(err));
      const wait = 400 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw last ?? new Error("embedding ناموفق");
}

export async function embedQuery(question: string): Promise<number[]> {
  const [vec] = await embedTexts([question], "query");
  return vec;
}

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return -1;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : -1;
}

export { EMBEDDING_MODEL, EMBEDDING_DIM };
