import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { returnToOrAsk, sanitizeReturnTo } from "./return-to.ts";

describe("sanitizeReturnTo", () => {
  it("accepts the allowlisted internal paths", () => {
    for (const path of ["/", "/ask", "/forms", "/residency", "/profile", "/sources", "/about", "/contact"]) {
      assert.equal(sanitizeReturnTo(path), path);
    }
  });

  it("strips query and hash before matching", () => {
    assert.equal(sanitizeReturnTo("/forms?x=1"), "/forms");
    assert.equal(sanitizeReturnTo("/profile#top"), "/profile");
  });

  it("falls back only when the path is unusable", () => {
    assert.equal(returnToOrAsk(undefined), "/ask");
    assert.equal(returnToOrAsk(""), "/ask");
    assert.equal(returnToOrAsk("/login"), "/ask");
    assert.equal(returnToOrAsk("/forms"), "/forms");
  });
});
