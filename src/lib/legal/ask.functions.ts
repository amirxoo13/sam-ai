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

const fieldSchema = z
  .object({
    story: z.string().optional(),
    claimant: z.string().optional(),
    respondent: z.string().optional(),
    city: z.string().optional(),
    amount: z.string().optional(),
    date: z.string().optional(),
    docs: z.string().optional(),
    caseNo: z.string().optional(),
    judgment: z.string().optional(),
  })
  .partial();

const draftSchema = z.object({
  story: z.string().trim().min(8).max(8000),
  formId: z.string().trim().max(80).optional(),
  answers: fieldSchema.optional(),
  hasJudgment: z.boolean().optional(),
});

export const draftLegal = createServerFn({ method: "POST" })
  .validator(draftSchema)
  .handler(async ({ data }) => {
    const { runDraft } = await import("./draft.server");
    return runDraft(data);
  });
