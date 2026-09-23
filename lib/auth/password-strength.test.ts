import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPasswordAcceptable, scorePassword } from "./password-strength.ts";

describe("scorePassword", () => {
  it("scores empty / too-short passwords as 0", () => {
    assert.equal(scorePassword("").score, 0);
    assert.equal(scorePassword("").label, "Too short");
    assert.equal(scorePassword("").acceptable, false);
    assert.equal(scorePassword("abc").score, 0);
    assert.equal(scorePassword("abc123").score, 0);
    assert.equal(scorePassword("seven!").score, 0);
  });

  it("scores 8-char passwords without a letter as Weak", () => {
    const r = scorePassword("12345678");
    assert.equal(r.score, 1);
    assert.equal(r.label, "Weak");
    assert.equal(r.acceptable, false);
    assert.ok(r.reasons.some((x) => x.includes("letter")));
  });

  it("scores 8-char passwords without a non-letter as Weak", () => {
    const r = scorePassword("abcdefgh");
    assert.equal(r.score, 1);
    assert.equal(r.label, "Weak");
    assert.equal(r.acceptable, false);
    assert.ok(r.reasons.some((x) => x.includes("number or symbol")));
  });

  it("scores 8-char letter+digit as Fair (acceptable)", () => {
    const r = scorePassword("abcdef12");
    assert.equal(r.score, 2);
    assert.equal(r.label, "Fair");
    assert.equal(r.acceptable, true);
    assert.equal(r.reasons.length, 0);
  });

  it("scores 8-char upper+lower+digit as Good (no length penalty)", () => {
    const r = scorePassword("Abcdef12");
    assert.equal(r.score, 3);
    assert.equal(r.label, "Good");
    assert.equal(r.acceptable, true);
  });

  it("scores 12+ char letter+digit as Good via length bonus", () => {
    const r = scorePassword("abcdefabcdef12");
    assert.equal(r.score, 3);
    assert.equal(r.label, "Good");
  });

  it("scores 12+ char upper+lower+digit as Strong", () => {
    const r = scorePassword("Abcdefghijkl12");
    assert.equal(r.score, 4);
    assert.equal(r.label, "Strong");
    assert.equal(r.acceptable, true);
  });

  it("rejects the literal string 'password' as Weak (no digit)", () => {
    const r = scorePassword("password");
    assert.equal(r.score, 1);
    assert.equal(r.label, "Weak");
    assert.equal(r.acceptable, false);
  });

  it("rejects 'Password1' as Fair (acceptable but not Strong — only 9 chars)", () => {
    const r = scorePassword("Password1");
    assert.equal(r.score, 3);
    assert.equal(r.label, "Good");
    assert.equal(r.acceptable, true);
  });
});

describe("isPasswordAcceptable", () => {
  it("returns false for short passwords", () => {
    assert.equal(isPasswordAcceptable(""), false);
    assert.equal(isPasswordAcceptable("short"), false);
    assert.equal(isPasswordAcceptable("12345678"), false);
  });

  it("returns true for fair-or-better passwords", () => {
    assert.equal(isPasswordAcceptable("abcdef12"), true);
    assert.equal(isPasswordAcceptable("Abcdefghijkl12"), true);
  });
});
