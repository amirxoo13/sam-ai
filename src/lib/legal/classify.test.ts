import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldRefuseDraft } from "./refuse.ts";

describe("shouldRefuseDraft", () => {
  it("refuses sexual offence and narcotics stories", () => {
    assert.equal(shouldRefuseDraft("موضوع تجاوز به عنف است و نیاز به شکواییه دارم"), true);
    assert.equal(shouldRefuseDraft("پرونده مواد مخدر دارم"), true);
  });

  it("does not refuse a fraud story", () => {
    assert.equal(shouldRefuseDraft("با مانور متقلبانه سرم کلاه گذاشت و پولم را برد"), false);
  });
});
