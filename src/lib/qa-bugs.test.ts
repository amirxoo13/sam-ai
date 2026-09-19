import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { returnToOrAsk, sanitizeReturnTo } from "./auth/return-to.ts";
import { contactBodySchema } from "./legal/request-schemas.ts";
import { BRAND } from "./brand.ts";
import {
  validateEmailField,
  validatePasswordField,
} from "./form-validation.ts";

const root = join(import.meta.dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("BUG-001 return path after login", () => {
  it("keeps protected paths and does not invent /ask for a valid next", () => {
    assert.equal(sanitizeReturnTo("/forms"), "/forms");
    assert.equal(sanitizeReturnTo("/residency"), "/residency");
    assert.equal(sanitizeReturnTo("/profile"), "/profile");
    assert.equal(sanitizeReturnTo("/ask"), "/ask");
  });

  it("rejects open redirects and login itself", () => {
    assert.equal(sanitizeReturnTo("https://evil.example"), undefined);
    assert.equal(sanitizeReturnTo("//evil.example"), undefined);
    assert.equal(sanitizeReturnTo("/login"), undefined);
    assert.equal(sanitizeReturnTo("/forgot"), undefined);
    assert.equal(returnToOrAsk("/no-such"), "/ask");
  });
});

describe("BUG-002/014 grok chrome is unwired", () => {
  it("vite config does not load grok PWA or grok.com", () => {
    const vite = read("vite.config.ts");
    assert.doesNotMatch(vite, /grokPwaPlugin/);
    assert.doesNotMatch(vite, /grok\.com/);
    assert.doesNotMatch(vite, /serverDir:\s*"\.\/server"/);
  });

  it("root layout has no PreviewHostBridge or grok links", () => {
    const rootSrc = read("src/routes/__root.tsx");
    assert.doesNotMatch(rootSrc, /PreviewHostBridge/);
    assert.doesNotMatch(rootSrc, /__grok/);
    assert.doesNotMatch(rootSrc, /grok\.com/);
  });

  it("public/__grok is gone", () => {
    assert.equal(existsSync(join(root, "public/__grok")), false);
  });
});

describe("BUG-003 clickjacking headers", () => {
  it("vercel.json sets DENY and frame-ancestors none", () => {
    const raw = read("vercel.json");
    const json = JSON.parse(raw) as {
      headers: { source: string; headers: { key: string; value: string }[] }[];
    };
    const all = json.headers.flatMap((h) => h.headers);
    const xfo = all.find((h) => h.key === "X-Frame-Options");
    const csp = all.find((h) => h.key === "Content-Security-Policy");
    assert.equal(xfo?.value, "DENY");
    assert.ok(csp?.value.includes("frame-ancestors 'none'"));
    assert.ok(csp?.value.includes("object-src 'none'"));
    assert.ok(!csp?.value.includes("grok.com"));
  });
});

describe("BUG-011 CTA copy", () => {
  it("does not claim a consultation relationship", () => {
    assert.equal(BRAND.cta, "شروع پرسش");
    assert.doesNotMatch(read("src/lib/brand.ts"), /شروع مشاوره/);
  });
});

describe("BUG-007 form validation copy", () => {
  it("returns Persian messages for empty and invalid fields", () => {
    assert.equal(validateEmailField(""), "ایمیل را وارد کنید.");
    assert.equal(validateEmailField("not-an-email"), "ایمیل نامعتبر است.");
    assert.equal(validatePasswordField(""), "رمز عبور را وارد کنید.");
    assert.equal(validatePasswordField("short"), "رمز عبور باید حداقل ۸ کاراکتر باشد.");
  });
});

describe("BUG-008 contact schema", () => {
  it("requires name, email and a real message", () => {
    assert.equal(contactBodySchema.safeParse({ name: "ا", email: "a@b.c", message: "کوتاه" }).success, false);
    assert.equal(
      contactBodySchema.safeParse({
        name: "علی رضایی",
        email: "ali@example.com",
        message: "نیاز به بررسی پرونده دارم.",
      }).success,
      true,
    );
  });
});

describe("BUG-012 SEO files", () => {
  it("ships robots, sitemap and favicon", () => {
    assert.ok(existsSync(join(root, "public/robots.txt")));
    assert.ok(existsSync(join(root, "public/sitemap.xml")));
    assert.ok(existsSync(join(root, "public/favicon.ico")));
    const robots = read("public/robots.txt");
    assert.match(robots, /Sitemap: https:\/\/sam-ai-green\.vercel\.app\/sitemap\.xml/);
    assert.match(read("public/sitemap.xml"), /\/terms/);
    assert.match(read("public/sitemap.xml"), /\/privacy/);
  });
});

describe("BUG-013 public stats shape", () => {
  it("api/stats does not leak models or dataset names", () => {
    const src = read("src/routes/api/stats.ts");
    assert.doesNotMatch(src, /embeddingModel/);
    assert.doesNotMatch(src, /qwenModel/);
    assert.doesNotMatch(src, /backend/);
    assert.doesNotMatch(src, /byDataset/);
    assert.doesNotMatch(src, /notes:/);
  });
});

describe("BUG-015 logo alt", () => {
  it("marks the decorative mark as presentation", () => {
    const src = read("src/components/brand-mark.tsx");
    assert.match(src, /role="presentation"/);
    assert.match(src, /aria-hidden="true"/);
  });
});
