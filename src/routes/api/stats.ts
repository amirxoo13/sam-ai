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
                "db07 complete core codes + filtered persian-legal-rag-jsonl + 1600 article-split statutes from the user ekhtebar PDF scrape (وکالت، مالیات، دیوان عدالت، گمرک، …). Core-code PDFs skipped.",
              case_law:
                "80 judgments from QomSSLab/law-text-dataset-fa plus advisory opinions (نظریات مشورتی) from persian-legal-rag-jsonl.",
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
