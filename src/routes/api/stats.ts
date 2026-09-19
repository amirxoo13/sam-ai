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
              total: stats.total,
              embedded: stats.embedded,
              searchable: stats.searchable,
              byType: stats.byType,
            },
            {
              headers: {
                "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
              },
            },
          );
        } catch (err) {
          const { logAndBuildErrorResponse } = await import("@/lib/server-error");
          return logAndBuildErrorResponse("api/stats", err, "آمار پیکره در دسترس نیست");
        }
      },
    },
  },
});
