import { createFileRoute } from "@tanstack/react-router";
import { randomUUID } from "node:crypto";
import { contactBodySchema } from "@/lib/legal/request-schemas";

const CONTACT_TO = "akbarmousavi1356@gmail.com";

export const Route = createFileRoute("/api/contact")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
          assertSameSiteRequest();

          const { consumeRateLimit, rateLimitedResponse } = await import("@/lib/rate-limit.server");
          const { clientIpFrom } = await import("@/lib/client-ip");
          const decision = await consumeRateLimit(`contact:${clientIpFrom(request)}`, {
            limit: 5,
            windowSeconds: 3600,
          });
          if (!decision.allowed) return rateLimitedResponse(decision);

          const parsed = contactBodySchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json({ error: "اطلاعات فرم تماس نامعتبر است." }, { status: 400 });
          }

          const { getSql } = await import("@/lib/db");
          const sql = await getSql();
          const id = randomUUID();
          await sql.query(
            `insert into contact_messages (id, name, email, message)
             values ($1, $2, $3, $4)`,
            [id, parsed.data.name, parsed.data.email, parsed.data.message],
          );

          let emailed = false;
          const { isMailConfigured, sendTransactionalEmail } = await import("@/lib/mail.server");
          if (isMailConfigured()) {
            try {
              const safeName = escapeHtml(parsed.data.name);
              const safeEmail = escapeHtml(parsed.data.email);
              const safeMessage = escapeHtml(parsed.data.message).replace(/\n/g, "<br>");
              await sendTransactionalEmail({
                to: CONTACT_TO,
                subject: `پیام تماس از ${parsed.data.name}`,
                text: `نام: ${parsed.data.name}\nایمیل: ${parsed.data.email}\n\n${parsed.data.message}`,
                html: `<p><strong>نام:</strong> ${safeName}</p><p><strong>ایمیل:</strong> ${safeEmail}</p><p>${safeMessage}</p>`,
              });
              emailed = true;
            } catch (err) {
              console.error("[api/contact] email send failed", err);
            }
          }

          return Response.json({
            ok: true,
            emailed,
            message: emailed
              ? "پیام شما ثبت و برای دفتر ارسال شد."
              : "پیام شما ثبت شد. دفتر آن را از سامانه می‌خواند.",
          });
        } catch (err) {
          const status = (err as { status?: number } | null)?.status === 403 ? 403 : 500;
          const { logAndBuildErrorResponse } = await import("@/lib/server-error");
          return logAndBuildErrorResponse(
            "api/contact",
            err,
            status === 403 ? "درخواست پذیرفته نشد." : "ارسال پیام انجام نشد.",
            status,
          );
        }
      },
    },
  },
});

function escapeHtml(value: string): string {
  return [...value]
    .map((ch) => {
      if (ch === "&") return "\u0026amp;";
      if (ch === "<") return "\u0026lt;";
      if (ch === ">") return "\u0026gt;";
      if (ch === '"') return "\u0026quot;";
      return ch;
    })
    .join("");
}
