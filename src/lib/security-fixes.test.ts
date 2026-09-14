import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cronAuthorized } from "./cron-auth.ts";
import { isHostAllowed } from "./crawler/host.ts";
import {
  askBodySchema,
  residencyAskBodySchema,
  userFileUploadSchema,
} from "./legal/request-schemas.ts";
import { logAndBuildErrorResponse } from "./server-error.ts";

/**
 * رگرسیون‌تست‌های باگ‌های امنیتی تأییدشده.
 *
 * نکتهٔ اصلی — و دلیل بازنویسی این فایل (BUG-004): نسخهٔ قبلی منطق
 * مورد آزمایش را داخل *خودِ فایل تست* دوباره می‌نوشت — یک `cronAuthorized`
 * محلی، یک `residencyBodySchema` محلی، یک `uploadSchema` محلی. پس عملاً کپی
 * خودش را می‌سنجید: اگر کسی مسیر واقعی را دوباره fail-open می‌کرد، همهٔ این
 * تست‌ها همچنان سبز می‌ماندند. اعتماد کاذب از نبودِ تست بدتر است.
 *
 * حالا هر تست دقیقاً همان ماژولی را import می‌کند که در production اجرا می‌شود.
 */

/** SEC/BUG — گارد fail-closed مسیر cron (src/lib/cron-auth.ts ← src/routes/api/cron/crawl.ts). */
describe("cron guard is fail-closed", () => {
  it("rejects when CRON_SECRET is unset (previously ran the crawl publicly)", () => {
    assert.equal(cronAuthorized(undefined, null), false);
    assert.equal(cronAuthorized(undefined, "Bearer anything"), false);
  });

  it("rejects when CRON_SECRET is an empty or whitespace string", () => {
    assert.equal(cronAuthorized("", null), false);
    assert.equal(cronAuthorized("   ", "Bearer   "), false);
  });

  it("rejects a wrong or missing bearer token when the secret is set", () => {
    assert.equal(cronAuthorized("s3cret", null), false);
    assert.equal(cronAuthorized("s3cret", "Bearer wrong"), false);
    assert.equal(cronAuthorized("s3cret", "s3cret"), false);
  });

  it("accepts only the exact bearer token", () => {
    assert.equal(cronAuthorized("s3cret", "Bearer s3cret"), true);
    assert.equal(cronAuthorized("  s3cret  ", "Bearer s3cret"), true);
  });
});

/** SEC-006 — مرز دامنهٔ کرالر (src/lib/crawler/host.ts ← run.server.ts). */
describe("SEC-006 crawler cannot walk off the allowed domain", () => {
  it("accepts the exact host and genuine subdomains", () => {
    assert.equal(isHostAllowed("majlis.ir", "majlis.ir"), true);
    assert.equal(isHostAllowed("rc.majlis.ir", "majlis.ir"), true);
    assert.equal(isHostAllowed("RC.MAJLIS.IR", "majlis.ir"), true);
    assert.equal(isHostAllowed("rc.majlis.ir:443", "majlis.ir"), true);
    assert.equal(isHostAllowed("qavanin.ir", "qavanin.ir"), true);
  });

  it("rejects the lookalike domains the old endsWith() check let through", () => {
    // مستندِ خودِ باگ: منطق قبلی دقیقاً همین را true می‌داد.
    assert.equal("evilmajlis.ir".endsWith("majlis.ir"), true);

    assert.equal(isHostAllowed("evilmajlis.ir", "majlis.ir"), false);
    assert.equal(isHostAllowed("notqavanin.ir", "qavanin.ir"), false);
    assert.equal(isHostAllowed("majlis.ir.attacker.com", "majlis.ir"), false);
  });

  it("rejects empty host or empty allowlist entry", () => {
    assert.equal(isHostAllowed("", "majlis.ir"), false);
    assert.equal(isHostAllowed("majlis.ir", ""), false);
  });
});

/** بدنهٔ خطا نباید پیام داخلی را حمل کند (src/lib/server-error.ts). */
describe("internal error messages stay server-side", () => {
  it("keeps the raw Error out of the client payload but puts it in the log", async () => {
    const internal = new Error('relation "legal_chunks" does not exist at 10.0.0.4:5432');
    const clientMessage = "خطای غیرمنتظره در پردازش درخواست";

    const originalConsoleError = console.error;
    const logged: unknown[][] = [];
    console.error = (...args: unknown[]) => {
      logged.push(args);
    };
    const res = (() => {
      try {
        return logAndBuildErrorResponse("test-scope", internal, clientMessage);
      } finally {
        console.error = originalConsoleError;
      }
    })();

    assert.equal(res.status, 500);
    const body = (await res.json()) as { error: string; errorId: string };
    const serialized = JSON.stringify(body);

    assert.equal(body.error, clientMessage);
    assert.ok(!serialized.includes(internal.message));
    assert.ok(!serialized.includes("5432"));
    assert.ok(!serialized.includes("legal_chunks"));

    // و مهم‌تر از پنهان‌کردن: جزئیات واقعاً باید جایی ثبت شده باشد.
    assert.ok(body.errorId.length > 0);
    assert.equal(logged.length, 1);
    assert.ok(String(logged[0][0]).includes(body.errorId));
    assert.equal(logged[0][1], internal);
  });

  it("honours a caller-supplied status code", async () => {
    const originalConsoleError = console.error;
    console.error = () => {};
    const res = (() => {
      try {
        return logAndBuildErrorResponse("test-scope", new Error("x"), "رد شد", 403);
      } finally {
        console.error = originalConsoleError;
      }
    })();
    assert.equal(res.status, 403);
  });
});

/** سقف ورودی residency-ask (src/lib/legal/request-schemas.ts ← /api/residency-ask). */
describe("residency-ask bounds its input", () => {
  it("rejects an oversized question instead of forwarding it to the model", () => {
    const result = residencyAskBodySchema.safeParse({ question: "ب".repeat(2001) });
    assert.equal(result.success, false);
  });

  it("rejects a question below the minimum length", () => {
    assert.equal(residencyAskBodySchema.safeParse({ question: "ب" }).success, false);
  });

  it("rejects a non-string question that the old interface accepted at runtime", () => {
    assert.equal(residencyAskBodySchema.safeParse({ question: 12345 }).success, false);
  });

  it("accepts a normal question at the same bound as /api/ask", () => {
    const result = residencyAskBodySchema.safeParse({
      question: "شرایط اقامت کاری در آلمان چیست؟",
      jurisdiction: "EU",
    });
    assert.equal(result.success, true);
  });

  it("rejects an out-of-range jurisdiction", () => {
    assert.equal(
      residencyAskBodySchema.safeParse({ question: "پرسش نمونه", jurisdiction: "XX" }).success,
      false,
    );
  });

  it("matches /api/ask on the question bound, so neither drifts", () => {
    const long = "ب".repeat(2001);
    assert.equal(askBodySchema.safeParse({ question: long }).success, false);
    assert.equal(residencyAskBodySchema.safeParse({ question: long }).success, false);
  });
});

/** سقف محتوای فایل کاربر (src/lib/legal/request-schemas.ts ← user-files.functions.ts). */
describe("user file upload is bounded at the validator", () => {
  it("rejects content past MAX_FILE_CHARS rather than silently truncating it", () => {
    const result = userFileUploadSchema.safeParse({
      filename: "big.txt",
      content: "x".repeat(40_001),
    });
    assert.equal(result.success, false);
  });

  it("accepts content at exactly the limit", () => {
    const result = userFileUploadSchema.safeParse({
      filename: "ok.txt",
      content: "x".repeat(40_000),
    });
    assert.equal(result.success, true);
  });

  it("rejects a non-uuid matterId", () => {
    assert.equal(
      userFileUploadSchema.safeParse({
        filename: "ok.txt",
        content: "hello",
        matterId: "not-a-uuid",
      }).success,
      false,
    );
  });
});
