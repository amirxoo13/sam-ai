// پیکره‌ی «پرسش اقامتی» (قوانین مهاجرت اروپا/آمریکا) کاملاً جدا از پیکره‌ی
// حقوقی/کیفری ایران است: دیتابیس جدا (همان Neon سایت اقامت — cursor/SAMAI)،
// مدل embedding جدا (bge-m3، نه multilingual-e5-small که برای legal_chunks
// استفاده می‌شود) و ابعاد بردار جدا. این دو پیکره را با هم قاطی نکن — چون
// حتی اگر در یک دیتابیس هم بودند، بردارهای دو مدل متفاوت قابل مقایسه با
// cosine/vector distance نیستند.

export const RESIDENCY_EMBEDDING_MODEL = process.env.RESIDENCY_EMBEDDING_MODEL || "BAAI/bge-m3";
export const RESIDENCY_EMBEDDING_DIM = 1024;
export const RESIDENCY_HF_EMBED_URL = `https://router.huggingface.co/hf-inference/models/${RESIDENCY_EMBEDDING_MODEL}/pipeline/feature-extraction`;

export const RESIDENCY_QWEN_BASE_URL =
  process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
export const RESIDENCY_QWEN_MODEL = process.env.QWEN_MODEL || "qwen3.8-max";
