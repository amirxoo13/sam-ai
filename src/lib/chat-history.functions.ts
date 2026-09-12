import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

const schema = z.object({
  chatType: z.enum(["legal", "residency"]),
  matterId: z.string().uuid().optional(),
});

export const getChatHistory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(schema)
  .handler(async ({ data, context }) => {
    const { listChatHistory } = await import("./chat-history.server");
    return listChatHistory(context.userId, data.chatType, 50, data.matterId);
  });
