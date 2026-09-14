import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stats")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { corpusStats } = await import("@/lib/legal/retrieve.server");
          const stats = await corpusStats();
          return Response.json(
            {
              embeddingModel:
                process.env.EMBEDDING_MODEL || "intfloat/multilingual-e5-small",
              embeddingDim: Number(process.env.EMBEDDING_DIM || 384),
              qwenModel: process.env.QWEN_MODEL || "qwen3.8-max",
              ...stats,
              notes: {
                statute:
                  "db07 core codes + persian-legal-rag-jsonl + ekhtebar PDFs + cleaned TreeText from qavanin.ir pages 1–102 + moshir iran-legal-corpus (130171 full articles, untruncated).",
                case_law:
                  "QomSSLab subset + نظریات مشورتی + آرای وحدت رویه ۸۰۲–۸۶۱ + آرای دیوان عدالت از qavanin.ir + 9996 full case records from power.",
              },
            },
            {
              headers: {
                // این پاسخ عمومی و غیرشخصی است ولی پشت آن پنج کوئری
                // aggregate روی یک جدول ۱۳۰k+ ردیفی اجرا می‌شود (P-5).
                // کش کوتاه، هزینه را بدون تغییر داده پایین می‌آورد.
                "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
              },
            },
          );
        } catch (err) {
          // SEC-008: قبلاً `err.message` عیناً به کلاینت برمی‌گشت — پیام درایور
          // Postgres شامل نام جدول، هاست و پورت دیتابیس است و این مسیر
          // احراز هویت هم ندارد.
          const { logAndBuildErrorResponse } = await import("@/lib/server-error");
          return logAndBuildErrorResponse("api/stats", err, "آمار پیکره در دسترس نیست");
        }
      },
    },
  },
});
