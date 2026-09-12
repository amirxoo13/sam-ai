import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

export const listMyMatters = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getOrCreateDefaultMatter, listMatters } = await import("./matter.server");
    await getOrCreateDefaultMatter(context.userId);
    return listMatters(context.userId);
  });

export const createMyMatter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ title: z.string().trim().min(2).max(120) }))
  .handler(async ({ data, context }) => {
    const { createMatter } = await import("./matter.server");
    return createMatter(context.userId, data.title);
  });
