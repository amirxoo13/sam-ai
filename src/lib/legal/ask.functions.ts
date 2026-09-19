import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { askFunctionSchema, draftFunctionSchema } from "./request-schemas";

export const askLegal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(askFunctionSchema)
  .handler(async ({ data, context }) => {
    const { runAsk } = await import("./ask.server");
    const { resolveMatterForUser, retrieveMatterExcerpts } = await import("@/lib/matter.server");
    const matter = await resolveMatterForUser(context.userId, data.matterId);
    const matterExcerpts = await retrieveMatterExcerpts(
      context.userId,
      matter.id,
      data.question,
    ).catch((err) => {
      console.warn("[askLegal] matter excerpt retrieval failed", err);
      return "";
    });
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
  const stats = await corpusStats();
  return {
    total: stats.total,
    embedded: stats.embedded,
    searchable: stats.searchable,
    byType: stats.byType,
  };
});

export const draftLegal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(draftFunctionSchema)
  .handler(async ({ data, context }) => {
    const { runDraft } = await import("./draft.server");
    const result = await runDraft(data);
    const { saveChatMessage } = await import("@/lib/chat-history.server");
    await saveChatMessage(context.userId, "legal", "user", `[برگه] ${data.story}`);
    await saveChatMessage(context.userId, "legal", "assistant", result.draft);
    return result;
  });
