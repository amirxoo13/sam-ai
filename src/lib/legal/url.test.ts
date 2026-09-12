import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isOfficialUrl } from "./url.ts";

describe("isOfficialUrl", () => {
  it("accepts http(s) and rejects file paths", () => {
    assert.equal(isOfficialUrl("https://www.ekhtebar.ir/10041/"), true);
    assert.equal(isOfficialUrl("http://qavanin.ir/law"), true);
    assert.equal(isOfficialUrl("db07-persian-law-database/LawItem.xlsx"), false);
    assert.equal(isOfficialUrl("/local/path"), false);
    assert.equal(isOfficialUrl(null), false);
  });
});
