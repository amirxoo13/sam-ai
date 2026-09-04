import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const askSchema = z.object({
  question: z.string().trim().min(4).max(2000),
  sourceType: z.enum(["all", "statute", "case_law"]).default("all"),
});

export const askLegal = createServerFn({ method: "POST" })
  .validator(askSchema)
  .handler(async ({ data }) => {
    const { runAsk } = await import("./ask.server");
    return runAsk(data);
  });

export const getCorpusStats = createServerFn({ method: "GET" }).handler(
  async () => {
    const { corpusStats } = await import("./retrieve.server");
    return corpusStats();
  },
);
