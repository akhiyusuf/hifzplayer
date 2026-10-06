import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { originOf, splitList } from "./origins.ts";

describe("originOf", () => {
  it("keeps scheme, host, and port", () => {
    assert.equal(originOf("https://diras.app/pricing"), "https://diras.app");
    assert.equal(originOf("http://localhost:3000"), "http://localhost:3000");
    assert.equal(originOf("diras.app"), "https://diras.app");
  });

  it("rejects junk", () => {
    assert.equal(originOf(""), null);
    assert.equal(originOf("ftp://files.example"), null);
    assert.equal(originOf("not a url"), null);
  });
});

describe("splitList", () => {
  it("splits comma-separated origins", () => {
    assert.deepEqual(splitList(" https://a.example ,https://b.example,"), [
      "https://a.example",
      "https://b.example",
    ]);
  });
});
