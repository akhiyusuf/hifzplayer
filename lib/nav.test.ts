import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FOCUS_FALLBACK,
  backHref,
  focusPassageHref,
  legalPeerHref,
  isFocusReadQuery,
  dropReadModeParam,
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
    assert.equal(backHref("practice"), "/practice");
    assert.equal(backHref("roadmap"), "/roadmap");
    assert.equal(backHref("privacy"), "/privacy");
    assert.equal(backHref("tos"), "/tos");
    assert.equal(backHref("nope"), "/home");
    assert.equal(backHref(undefined), "/home");
    assert.equal(backHref("home"), "/home");
  });
});

describe("legalPeerHref", () => {
  it("points Privacy and Terms at each other, and keeps a known from", () => {
    assert.equal(legalPeerHref("privacy", undefined), "/privacy?from=tos");
    assert.equal(legalPeerHref("tos", undefined), "/tos?from=privacy");
    assert.equal(legalPeerHref("privacy", "settings"), "/privacy?from=settings");
    assert.equal(legalPeerHref("tos", "account"), "/tos?from=account");
    assert.equal(legalPeerHref("privacy", "home"), "/privacy?from=home");
    assert.equal(legalPeerHref("privacy", "nope"), "/privacy?from=tos");
    assert.equal(legalPeerHref("tos", "tos"), "/tos?from=privacy");
  });
});

describe("safePath", () => {
  it("allows only same-origin relative paths", () => {
    assert.equal(safePath("/account?from=settings"), "/account?from=settings");
    assert.equal(safePath("https://evil.example/x"), "/home");
    assert.equal(safePath("//evil.example"), "/home");
    assert.equal(safePath(undefined), "/home");
    assert.equal(safePath(null), "/home");
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

describe("dropReadModeParam", () => {
  it("strips mode so leaving a drill is not undone by the URL", () => {
    assert.equal(dropReadModeParam("from=1&to=7&style=focus&mode=masked"), "from=1&to=7&style=focus");
    assert.equal(dropReadModeParam("?mode=relay&from=1"), "from=1");
    assert.equal(dropReadModeParam("from=1&to=7"), "from=1&to=7");
  });
});
