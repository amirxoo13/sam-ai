import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stats")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { corpusStats } = await import("@/lib/legal/retrieve.server");
          const stats = await corpusStats();
          return Response.json({
            embeddingModel:
              process.env.EMBEDDING_MODEL || "intfloat/multilingual-e5-small",
            embeddingDim: Number(process.env.EMBEDDING_DIM || 384),
            qwenModel: process.env.QWEN_MODEL || "qwen3.8-max",
            ...stats,
            notes: {
              statute:
                "db07 core codes + persian-legal-rag-jsonl + ekhtebar PDFs + 1800 cleaned TreeText chunks from qavanin.ir (pages 1–102).",
              case_law:
                "QomSSLab subset + نظریات مشورتی + آرای وحدت رویه ۸۰۲–۸۶۱ + آرای دیوان عدالت از qavanin.ir.",
            },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "خطای ناشناخته";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
