import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

export const uploadUserFile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      filename: z.string().trim().min(1).max(200),
      // سقف سرور در createUserFile هم ۴۰٬۰۰۰ است؛ اینجا هم اعمال می‌شود تا
      // payload بزرگ پیش از پردازش رد شود، نه بعد از دریافت کامل (BUG-004).
      content: z.string().trim().min(1).max(40_000),
      matterId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { createUserFile } = await import("./user-files.server");
    return createUserFile(context.userId, data.filename, data.content, data.matterId);
  });

export const listMyFiles = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { listUserFiles } = await import("./user-files.server");
    return listUserFiles(context.userId);
  });

export const deleteMyFile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data, context }) => {
    const { deleteUserFile } = await import("./user-files.server");
    await deleteUserFile(context.userId, data.id);
    return { ok: true };
  });
