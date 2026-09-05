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
                "db07 LawItem.xlsx complete core codes plus filtered unique statutes from github.com/amirxoo13/persian-legal-rag-jsonl (تجارت، ثبت، تأمین اجتماعی، اراضی، …). Raw 82k dump not ingested.",
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
