function envMap(): Record<string, string | undefined> {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process;
  return proc?.env ?? {};
}

function pick(names: string[]): string | undefined {
  const env = envMap();
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function looksLikePostgres(value: string): boolean {
  return /^(postgres(ql)?:\/\/)/i.test(value);
}

function firstMatchingValue(test: (value: string) => boolean): string | undefined {
  for (const raw of Object.values(envMap())) {
    const value = raw?.trim();
    if (value && test(value)) return value;
  }
  return undefined;
}

export function huggingfaceToken(): string {
  const named = pick([
    "HF_TOKEN",
    "HUGGINGFACE_HUB_TOKEN",
    "HUGGING_FACE_HUB_TOKEN",
    "HUGGINGFACE_TOKEN",
    "HF_API_TOKEN",
    "HF_API_KEY",
    "hf",
    "HF",
  ]);
  if (named && !looksLikePostgres(named)) return named;

  const scanned = firstMatchingValue((value) => /^hf_[A-Za-z0-9]+$/.test(value));
  if (scanned) return scanned;

  throw new Error(
    "توکن Hugging Face پیدا نشد. در Environment اسم متغیر را دقیقاً HF_TOKEN بگذارید (نه hf و نه فیلد database).",
  );
}

export function qwenApiKey(): string {
  const named = pick([
    "QWEN_API_KEY",
    "DASHSCOPE_API_KEY",
    "qwen",
    "QWEN",
    "QWEN_KEY",
  ]);
  if (named && !looksLikePostgres(named)) return named;

  const scanned = firstMatchingValue(
    (value) => /^sk-(ws-)?[A-Za-z0-9._-]+$/.test(value) && !looksLikePostgres(value),
  );
  if (scanned) return scanned;

  throw new Error(
    "کلید Qwen پیدا نشد. در Environment اسم متغیر را دقیقاً QWEN_API_KEY بگذارید.",
  );
}
