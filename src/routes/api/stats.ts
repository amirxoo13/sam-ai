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
                "Hugging Face is connected. QomSSLab/legal_full_v4 is still gated until access is granted; case-law retrieval works.",
              case_law: "Ingested from QomSSLab/law-text-dataset-fa",
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
