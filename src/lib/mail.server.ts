/**
 * ارسال ایمیل واقعی از طریق HTTP API سرویس Resend.
 * کلید از RESEND_API_KEY خوانده می‌شود. بدون کلید، فراخوانی رد می‌شود —
 * تماس‌گیرنده باید خطا را به کاربر نشان دهد، نه اینکه وانمود به ارسال کند.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "هوش مصنوعی اها <beth.t@example.com>";

export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendTransactionalEmail(
  message: TransactionalEmail,
): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  const from = process.env.RESEND_FROM?.trim() || DEFAULT_FROM;
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[mail] Resend rejected", res.status, detail.slice(0, 400));
    throw new Error(`email provider rejected the message (${res.status})`);
  }
  const body = (await res.json()) as { id?: string };
  return { id: body.id ?? "" };
}
