import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyAuthority } from "./authority.ts";
import { extractCitedNumbers, verifyCitations } from "./cite.ts";
import type { RetrievedChunk } from "./types.ts";

function chunk(partial: Partial<RetrievedChunk> & Pick<RetrievedChunk, "id" | "content">): RetrievedChunk {
  const title = partial.source_title ?? "قانون مدنی";
  return {
    source_type: "statute",
    source_title: title,
    article_number: "10",
    law_date: null,
    source_url: "https://qavanin.ir/example",
    score: 1,
    authority: classifyAuthority("statute", title),
    matchKind: "exact_article",
    ...partial,
  };
}

describe("cite", () => {
  it("extracts article cites from an answer", () => {
    const cites = extractCitedNumbers("طبق ماده 10 قانون مدنی قراردادهای خصوصی...");
    assert.equal(cites[0].number, "10");
    assert.equal(cites[0].kind, "article");
  });

  it("verifies a cite that exists in retrieved chunks", () => {
    const { verified, unverified } = verifyCitations("ماده 10 قانون مدنی", [
      chunk({ id: "c1", content: "ماده 10 - قراردادهای خصوصی نسبت به کسانی که آن را منعقد نموده‌اند..." }),
    ]);
    assert.equal(verified.length, 1);
    assert.equal(unverified.length, 0);
  });

  it("flags a cite that is not in the retrieved chunks", () => {
    const { unverified } = verifyCitations("طبق ماده 999 قانون مدنی", [
      chunk({ id: "c1", content: "ماده 10 - قراردادهای خصوصی", article_number: "10" }),
    ]);
    assert.ok(unverified.some((c) => c.number === "999"));
  });
});
