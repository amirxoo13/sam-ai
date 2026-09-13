import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { uniqueById } from "./unique.ts";

describe("uniqueById", () => {
  it("keeps a single row per id", () => {
    const out = uniqueById([
      { id: "a", content: "short" },
      { id: "a", content: "a much longer body of the same article" },
      { id: "b", content: "other" },
    ]);
    assert.equal(out.length, 2);
    assert.equal(out.find((r) => r.id === "a")?.content, "a much longer body of the same article");
  });

  it("does not emit duplicate ids that would break ON CONFLICT DO UPDATE", () => {
    const ids = uniqueById([
      { id: "x", content: "1" },
      { id: "x", content: "2" },
      { id: "x", content: "3" },
    ]).map((r) => r.id);
    assert.deepEqual(ids, ["x"]);
  });
});
