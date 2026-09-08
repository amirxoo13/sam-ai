import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

const askSchema = z.object({
  question: z.string().trim().min(4).max(2000),
  sourceType: z.enum(["all", "statute", "case_law"]).default("all"),
});

export const askLegal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(askSchema)
  .handler(async ({ data, context }) => {
    const { runAsk } = await import("./ask.server");
    const { getUserFilesContext } = await import("@/lib/user-files.server");
    const userFilesContext = await getUserFilesContext(context.userId).catch(() => "");
    const result = await runAsk({ ...data, userFilesContext: userFilesContext || undefined });
    const { saveChatMessage } = await import("@/lib/chat-history.server");
    await saveChatMessage(context.userId, "legal", "user", data.question);
    await saveChatMessage(context.userId, "legal", "assistant", result.answer);
    return result;
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
  .middleware([authMiddleware])
  .validator(draftSchema)
  .handler(async ({ data, context }) => {
    const { runDraft } = await import("./draft.server");
    const result = await runDraft(data);
    const { saveChatMessage } = await import("@/lib/chat-history.server");
    await saveChatMessage(context.userId, "legal", "user", `[برگه] ${data.story}`);
    await saveChatMessage(context.userId, "legal", "assistant", result.draft);
    return result;
  });
