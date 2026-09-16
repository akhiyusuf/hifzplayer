import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FOCUS_FALLBACK,
  backHref,
  focusPassageHref,
  isFocusReadQuery,
  safePath,
  signInHref,
  signInReturnPath,
} from "./nav.ts";

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

describe("sign-in return", () => {
  it("lands in the app after Clerk, not the marketing page or another auth screen", () => {
    assert.equal(signInReturnPath(undefined), "/home");
    assert.equal(signInReturnPath("/"), "/home");
    assert.equal(signInReturnPath("/sign-in"), "/home");
    assert.equal(signInReturnPath("/sign-up?redirect_url=/home"), "/home");
    assert.equal(signInReturnPath("/settings"), "/settings");
    assert.equal(signInReturnPath("/account?from=settings"), "/account?from=settings");
    assert.equal(signInHref("/settings"), "/sign-in?redirect_url=%2Fsettings");
  });
});

describe("focusPassageHref", () => {
  it("defaults to Al-Fatiha in Focus", () => {
    assert.equal(
      focusPassageHref(FOCUS_FALLBACK),
      "/read/1?from=1&to=7&style=focus",
    );
  });

  it("includes optional mode and back", () => {
    assert.equal(
      focusPassageHref({ chapter: 103, from: 1, to: 3 }, { mode: "word", back: "home" }),
      "/read/103?from=1&to=3&style=focus&mode=word&back=home",
    );
  });
});

describe("isFocusReadQuery", () => {
  it("detects style=focus and Focus jobs", () => {
    assert.equal(isFocusReadQuery("style=focus"), true);
    assert.equal(isFocusReadQuery("?mode=word"), true);
    assert.equal(isFocusReadQuery("from=1&to=7"), false);
  });
});
