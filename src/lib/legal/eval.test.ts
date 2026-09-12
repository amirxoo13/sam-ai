import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyAuthority } from "./authority.ts";
import { evaluateAnswer, evaluateRetrieval } from "./eval.ts";
import type { RetrievedChunk } from "./types.ts";

function chunk(partial: Partial<RetrievedChunk> & Pick<RetrievedChunk, "id" | "content">): RetrievedChunk {
  const source_type = partial.source_type ?? "statute";
  const title = partial.source_title ?? "قانون مدنی";
  const base: RetrievedChunk = {
    source_type,
    source_title: title,
    article_number: "10",
    law_date: null,
    source_url: "https://www.ekhtebar.ir/example",
    score: 1,
    authority: classifyAuthority(source_type, title),
    matchKind: "exact_article",
    ...partial,
  };
  return {
    ...base,
    authority: partial.authority ?? classifyAuthority(base.source_type, base.source_title),
  };
}

describe("evaluate", () => {
  it("counts exact article hits separately from vectors", () => {
    const report = evaluateRetrieval([
      chunk({ id: "a", content: "ماده 10", matchKind: "exact_article" }),
      chunk({ id: "b", content: "رویه", source_type: "case_law", source_title: "شعبه", matchKind: "vector" }),
    ]);
    assert.equal(report.exactArticleHits, 1);
    assert.equal(report.vectorHits, 1);
    assert.equal(report.bindingSources, 1);
  });

  it("scores citation verification without inventing cites", () => {
    const report = evaluateAnswer("طبق ماده 10 و ماده 999 قانون مدنی", [
      chunk({ id: "c1", content: "ماده 10 - قراردادهای خصوصی", article_number: "10" }),
    ]);
    assert.equal(report.cited, 2);
    assert.equal(report.verified, 1);
    assert.equal(report.unverified, 1);
  });
});
