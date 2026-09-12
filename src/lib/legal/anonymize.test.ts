import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { anonymizeChunk, anonymizeLegalText } from "./anonymize.ts";

describe("anonymize", () => {
  it("strips national id and name, keeps charge and judgment", () => {
    const raw = JSON.stringify({
      subject: "کلاهبرداری",
      description: "اتهام کلاهبرداری نسبت به علی رضایی",
      persons: [
        {
          role: "خواهان/شاکی",
          fullName: "علی رضایی",
          nationalCode: "0012345678",
          mobile: "09120000000",
          address: "تهران خیابان انقلاب",
          personType: "حقیقی",
        },
      ],
      judgments: [{ text: "محکومیت به رد مال" }],
      charges: ["کلاهبرداری"],
    });
    const { content, sourceTitle } = anonymizeLegalText(raw);
    assert.equal(content.includes("0012345678"), false);
    assert.equal(content.includes("علی رضایی"), false);
    assert.equal(content.includes("09120000000"), false);
    assert.equal(content.includes("کلاهبرداری"), true);
    assert.equal(content.includes("محکومیت به رد مال"), true);
    assert.equal(content.includes('"role"'), true);
    assert.ok(sourceTitle && sourceTitle.includes("خواهان"));
  });

  it("does not alter a statute chunk", () => {
    const chunk = {
      id: "s1",
      content: "ماده 10 قانون مدنی",
      source_title: "قانون مدنی",
      hf_dataset: "amirxo13/iran-legal-corpus",
    };
    const out = anonymizeChunk(chunk);
    assert.equal(out.content, chunk.content);
    assert.equal(out.source_title, chunk.source_title);
  });
});
