import { EMBEDDING_DIM, EMBEDDING_MODEL, HF_EMBED_URL } from "./config";

function token() {
  const t = process.env.HF_TOKEN;
  if (!t) throw new Error("HF_TOKEN تنظیم نشده است");
  return t;
}

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

export async function embedTexts(
  texts: string[],
  kind: "query" | "passage",
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const inputs = texts.map((t) => `${kind}: ${t.slice(0, 1800)}`);
  const res = await fetch(HF_EMBED_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs }),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      `Hugging Face embed HTTP ${res.status}: ${JSON.stringify(json).slice(0, 400)}`,
    );
  }
  const vecs = asVectors(json);
  if (vecs.length !== texts.length) {
    throw new Error(
      `تعداد بردار ${vecs.length} با ورودی ${texts.length} نمی‌خواند`,
    );
  }
  return vecs;
}

export async function embedQuery(question: string): Promise<number[]> {
  const [vec] = await embedTexts([question], "query");
  return vec;
}

/** Cosine similarity. Vectors are L2-normalized when produced here; still safe if not. */
export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : -1;
}

export { EMBEDDING_MODEL, EMBEDDING_DIM };
