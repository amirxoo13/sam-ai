import { huggingfaceToken } from "@/lib/legal/secrets.server";
import { RESIDENCY_EMBEDDING_DIM, RESIDENCY_HF_EMBED_URL } from "./config";

const HF_FETCH_TIMEOUT_MS = 30_000;

function meanPool(tokenVectors: number[][]): number[] {
  const dims = tokenVectors[0].length;
  const sums = new Array(dims).fill(0);
  for (const vec of tokenVectors) {
    for (let i = 0; i < dims; i++) sums[i] += vec[i];
  }
  return sums.map((s) => s / tokenVectors.length);
}

function normalizeEmbeddingResponse(data: unknown): number[] {
  if (Array.isArray(data) && typeof data[0] === "number") {
    return data as number[];
  }
  if (Array.isArray(data) && Array.isArray(data[0])) {
    const matrix = data as number[][];
    if (typeof matrix[0][0] === "number") return meanPool(matrix);
    if (Array.isArray(matrix[0][0])) return meanPool(matrix[0] as unknown as number[][]);
  }
  throw new Error(`پاسخ غیرمنتظره از HF Inference API: ${JSON.stringify(data).slice(0, 300)}`);
}

/** embedding واقعی با مدل bge-m3 — همانی که پیکره‌ی اقامتی با آن ایندکس شده. */
export async function embedResidencyQuery(text: string): Promise<number[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HF_FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(RESIDENCY_HF_EMBED_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${huggingfaceToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`HF Inference API بعد از ${HF_FETCH_TIMEOUT_MS / 1000} ثانیه پاسخ نداد.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HF Inference API با خطا مواجه شد (status ${res.status}): ${body.slice(0, 500)}`);
  }

  const data = await res.json();
  const vec = normalizeEmbeddingResponse(data);
  if (vec.length !== RESIDENCY_EMBEDDING_DIM) {
    throw new Error(`بعد بردار ${vec.length} است نه ${RESIDENCY_EMBEDDING_DIM}`);
  }
  return vec;
}
