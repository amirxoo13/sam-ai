import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseArticleRefs } from "./article-query.ts";
import { rankRows, type RankRow } from "./rank.ts";

function row(p: Partial<RankRow> & Pick<RankRow, "id" | "content">): RankRow {
  return {
    source_type: "statute",
    source_title: "قانون مدنی",
    article_number: null,
    law_date: null,
    source_url: "https://qavanin.ir/x",
    matchKind: "fts",
    ...p,
  };
}

describe("rankRows", () => {
  it("puts the exact civil-code article 10 first", () => {
    const q = "ماده ۱۰ قانون مدنی چه می‌گوید؟";
    const refs = parseArticleRefs(q);
    const ranked = rankRows(q, refs, [
      row({
        id: "other",
        source_title: "قانون مجازات اسلامی",
        article_number: "10",
        content: "ماده 10 قانون مجازات ...",
        semantic: 0.9,
        matchKind: "vector",
      }),
      row({
        id: "civil10",
        source_title: "قانون مدنی",
        article_number: "10",
        content: "ماده 10 - قراردادهای خصوصی نسبت به کسانی که آن را منعقد نموده‌اند نافذ است.",
        semantic: 0.2,
        matchKind: "exact_article",
      }),
    ], 8);
    assert.equal(ranked[0].id, "civil10");
    assert.equal(ranked[0].matchKind, "exact_article");
    assert.ok(ranked[0].score > ranked[1].score);
  });

  it("keeps a full-text hit even without a vector score", () => {
    const q = "مسئولیت مدنی ناشی از تقصیر";
    const refs = parseArticleRefs(q);
    const ranked = rankRows(q, refs, [
      row({
        id: "fts1",
        source_title: "قانون مسئولیت مدنی",
        article_number: "1",
        content: "هر کس بدون مجوز قانونی عمداً یا در نتیجه بی‌احتیاطی به جان یا سلامتی یا مال دیگری خسارت وارد نماید مسئول است.",
        matchKind: "fts",
      }),
    ], 8);
    assert.equal(ranked[0]?.id, "fts1");
  });

  it("does not treat a long case number as an article match", () => {
    const q = "ماده ۱۰ قانون مدنی";
    const refs = parseArticleRefs(q);
    const ranked = rankRows(q, refs, [
      row({
        id: "case",
        source_type: "case_law",
        source_title: "خوانده/متهم — جرائم عمومی",
        article_number: "9709982997500490",
        content: "{}",
        matchKind: "exact_article",
      }),
      row({
        id: "civil10",
        source_title: "قانون مدنی",
        article_number: "10",
        content: "ماده 10 قراردادهای خصوصی",
        matchKind: "exact_article",
      }),
    ], 8);
    assert.equal(ranked[0].id, "civil10");
  });
});
