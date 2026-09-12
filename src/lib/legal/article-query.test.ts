import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectLawHint, parseArticleRefs, toEnDigits, articleMatchSqlValues } from "./article-query.ts";

describe("article-query", () => {
  it("converts persian digits", () => {
    assert.equal(toEnDigits("ماده ۱۰"), "ماده 10");
  });

  it("parses civil code article 10", () => {
    const refs = parseArticleRefs("ماده ۱۰ قانون مدنی چه می‌گوید؟");
    assert.equal(refs.length, 1);
    assert.equal(refs[0].kind, "article");
    assert.equal(refs[0].number, "10");
    assert.equal(refs[0].lawHint, "مدنی");
  });

  it("parses constitution principle 35", () => {
    const refs = parseArticleRefs("اصل ۳۵ قانون اساسی درباره حق وکیل");
    assert.equal(refs[0].kind, "principle");
    assert.equal(refs[0].number, "35");
    assert.equal(refs[0].lawHint, "اساسی");
  });

  it("does not treat a year as an article without ماده", () => {
    const refs = parseArticleRefs("در سال 1400 چه اتفاقی افتاد؟");
    assert.equal(refs.filter((r) => r.kind === "article").length, 0);
  });

  it("detects check law", () => {
    assert.equal(detectLawHint("قانون صدور چک"), "چک");
  });

  it("includes persian digits in sql match values", () => {
    const refs = parseArticleRefs("ماده ۱۰ قانون مدنی");
    const values = articleMatchSqlValues(refs[0]);
    assert.ok(values.includes("10"));
    assert.ok(values.includes("۱۰"));
  });
});
