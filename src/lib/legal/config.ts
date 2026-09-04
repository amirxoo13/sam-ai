export { LEGAL_DISCLAIMER } from "./copy";

export const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || "intfloat/multilingual-e5-small";

export const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM || 384);

export const HF_EMBED_URL = `https://router.huggingface.co/hf-inference/models/${EMBEDDING_MODEL}/pipeline/feature-extraction`;

export const QWEN_BASE_URL =
  process.env.QWEN_BASE_URL ||
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

export const QWEN_MODEL = process.env.QWEN_MODEL || "qwen3.8-max";

export const TOP_K = 5;
