import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { backHref, safePath } from "./nav.ts";

describe("backHref", () => {
  it("returns settings, account, or home", () => {
    assert.equal(backHref("settings"), "/settings");
    assert.equal(backHref("account"), "/account");
    assert.equal(backHref("pricing"), "/pricing");
    assert.equal(backHref("listen"), "/listen");
    assert.equal(backHref("roadmap"), "/roadmap");
    assert.equal(backHref("nope"), "/home");
    assert.equal(backHref(undefined), "/home");
    assert.equal(backHref("home"), "/home");
  });
});

describe("safePath", () => {
  it("allows only same-origin relative paths", () => {
    assert.equal(safePath("/account?from=settings"), "/account?from=settings");
    assert.equal(safePath("https://evil.example/x"), "/home");
    assert.equal(safePath("//evil.example"), "/home");
    assert.equal(safePath(undefined), "/home");
  });
});
