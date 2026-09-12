import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

const askSchema = z.object({
  question: z.string().trim().min(4).max(2000),
  sourceType: z.enum(["all", "statute", "case_law", "convention", "advisory_opinion", "terminology"]).default("all"),
  matterId: z.string().uuid().optional(),
});

export const askLegal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(askSchema)
  .handler(async ({ data, context }) => {
    const { runAsk } = await import("./ask.server");
    const { getOrCreateDefaultMatter, assertMatterOwner, retrieveMatterExcerpts } = await import("@/lib/matter.server");
    const matter = data.matterId
      ? ((await assertMatterOwner(context.userId, data.matterId)) ? { id: data.matterId } : await getOrCreateDefaultMatter(context.userId))
      : await getOrCreateDefaultMatter(context.userId);
    const matterExcerpts = await retrieveMatterExcerpts(context.userId, matter.id, data.question).catch(() => "");
    const result = await runAsk({
      question: data.question,
      sourceType: data.sourceType,
      matterExcerpts: matterExcerpts || undefined,
      userId: context.userId,
    });
    const { saveChatMessage } = await import("@/lib/chat-history.server");
    await saveChatMessage(context.userId, "legal", "user", data.question, matter.id, result.requestId);
    await saveChatMessage(context.userId, "legal", "assistant", result.answer, matter.id, result.requestId);
    return result;
  });

export const getCorpusStats = createServerFn({ method: "GET" }).handler(async () => {
  const { corpusStats } = await import("./retrieve.server");
  return corpusStats();
});

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
