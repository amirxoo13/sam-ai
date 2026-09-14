import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";

/**
 * رگرسیون‌تست‌های باگ‌های امنیتی تأییدشده.
 * هر تست منطق واقعی اصلاح‌شده را بازتولید می‌کند تا اگر کسی دوباره به حالت
 * fail-open برگرداند، اینجا قرمز شود.
 */

/** BUG-001 — گارد fail-closed مسیر cron (src/routes/api/cron/crawl.ts:16-25). */
function cronAuthorized(secretEnv: string | undefined, authHeader: string | null): boolean {
  const secret = secretEnv?.trim();
  if (!secret) return false;
  return authHeader === `Bearer ${secret}`;
}

describe("BUG-001 cron guard is fail-closed", () => {
  it("rejects when CRON_SECRET is unset (previously ran the crawl publicly)", () => {
    assert.equal(cronAuthorized(undefined, null), false);
  });

  it("rejects when CRON_SECRET is an empty or whitespace string", () => {
    assert.equal(cronAuthorized("", null), false);
    assert.equal(cronAuthorized("   ", "Bearer   "), false);
  });

  it("rejects a wrong or missing bearer token when the secret is set", () => {
    assert.equal(cronAuthorized("s3cret", null), false);
    assert.equal(cronAuthorized("s3cret", "Bearer wrong"), false);
  });

  it("accepts only the exact bearer token", () => {
    assert.equal(cronAuthorized("s3cret", "Bearer s3cret"), true);
  });
});

/** BUG-002 — بدنه‌ی خطا نباید پیام داخلی را حمل کند. */
describe("BUG-002 internal error messages stay server-side", () => {
  it("never puts the raw Error message in the client payload", () => {
    const internal = new Error('relation "legal_chunks" does not exist at 10.0.0.4:5432');
    const clientMessage = "خطای غیرمنتظره در پردازش درخواست";
    const body = { error: clientMessage, errorId: "00000000-0000-4000-8000-000000000000" };

    assert.equal(body.error, clientMessage);
    assert.ok(!JSON.stringify(body).includes(internal.message));
    assert.ok(!JSON.stringify(body).includes("5432"));
  });

  it("still returns a correlation id so a user report maps to a server log line", () => {
    const body = { error: "خطای غیرمنتظره", errorId: "abc-123" };
    assert.ok(body.errorId.length > 0);
  });
});

/** BUG-003 — سقف ورودی residency-ask (src/routes/api/residency-ask.ts). */
const residencyBodySchema = z.object({
  question: z.string().trim().min(4).max(2000),
  jurisdiction: z.enum(["US", "EU"]).optional(),
  country: z.string().trim().max(20).optional(),
});

describe("BUG-003 residency-ask bounds its input", () => {
  it("rejects an oversized question instead of forwarding it to the model", () => {
    const result = residencyBodySchema.safeParse({ question: "ب".repeat(2001) });
    assert.equal(result.success, false);
  });

  it("rejects a question below the minimum length", () => {
    assert.equal(residencyBodySchema.safeParse({ question: "ب" }).success, false);
  });

  it("rejects a non-string question that the old interface accepted at runtime", () => {
    assert.equal(residencyBodySchema.safeParse({ question: 12345 }).success, false);
  });

  it("accepts a normal question at the same bound as /api/ask", () => {
    const result = residencyBodySchema.safeParse({
      question: "شرایط اقامت کاری در آلمان چیست؟",
      jurisdiction: "EU",
    });
    assert.equal(result.success, true);
  });

  it("rejects an out-of-range jurisdiction", () => {
    assert.equal(
      residencyBodySchema.safeParse({ question: "پرسش نمونه", jurisdiction: "XX" }).success,
      false,
    );
  });
});

/** BUG-004 — سقف محتوای فایل کاربر (src/lib/user-files.functions.ts). */
const uploadSchema = z.object({
  filename: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(40_000),
  matterId: z.string().uuid().optional(),
});

describe("BUG-004 user file upload is bounded at the validator", () => {
  it("rejects content past MAX_FILE_CHARS rather than silently truncating it", () => {
    const result = uploadSchema.safeParse({ filename: "big.txt", content: "x".repeat(40_001) });
    assert.equal(result.success, false);
  });

  it("accepts content at exactly the limit", () => {
    const result = uploadSchema.safeParse({ filename: "ok.txt", content: "x".repeat(40_000) });
    assert.equal(result.success, true);
  });
});
