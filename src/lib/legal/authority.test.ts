import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyAuthority } from "./authority.ts";

describe("authority", () => {
  it("ranks constitution above ordinary statute", () => {
    const a = classifyAuthority("statute", "قانون اساسی جمهوری اسلامی ایران");
    const b = classifyAuthority("statute", "قانون مدنی");
    assert.equal(a.binding, "binding");
    assert.ok(a.rank > b.rank);
  });

  it("marks unity ruling as binding on courts", () => {
    const a = classifyAuthority("case_law", "رأی وحدت رویه هیأت عمومی دیوان عالی");
    assert.equal(a.binding, "binding_on_courts");
  });

  it("marks advisory opinions as non-binding", () => {
    const a = classifyAuthority("advisory_opinion", "نظریه مشورتی اداره حقوقی");
    assert.equal(a.binding, "advisory");
  });

  it("marks branch judgments persuasive", () => {
    const a = classifyAuthority("case_law", "دادنامه شعبه ۱۰۲۴ کیفری تهران");
    assert.equal(a.binding, "persuasive");
  });
});
