import { randomUUID } from "node:crypto";

/**
 * پیام خطای داخلی (پیام درایور DB، شبکه، یا سرویس بیرونی) هرگز نباید عیناً به
 * کلاینت برگردد — جزئیات پیاده‌سازی را فاش می‌کند (BUG-002). در عوض:
 * جزئیات کامل با یک correlation id در لاگ سرور می‌نشیند و کلاینت فقط همان id
 * را به‌همراه یک پیام ثابت می‌گیرد تا بتوان گزارش کاربر را به لاگ وصل کرد.
 */
export function logAndBuildErrorResponse(
  scope: string,
  err: unknown,
  clientMessage = "خطای غیرمنتظره در پردازش درخواست",
  status = 500,
): Response {
  const correlationId = randomUUID();
  console.error(`[${scope}] errorId=${correlationId}`, err);
  return Response.json({ error: clientMessage, errorId: correlationId }, { status });
}
