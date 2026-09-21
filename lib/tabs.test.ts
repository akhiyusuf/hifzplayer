import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hideMobileTabs, mobileTabId } from "./tabs.ts";

describe("mobileTabId", () => {
  it("maps hub routes onto Menu, Practice, Playlists, and Settings", () => {
    assert.equal(mobileTabId("/home"), "menu");
    assert.equal(mobileTabId("/roadmap"), "menu");
    assert.equal(mobileTabId("/practice"), "practice");
    assert.equal(mobileTabId("/listen"), "playlists");
    assert.equal(mobileTabId("/settings"), "settings");
    assert.equal(mobileTabId("/account"), "settings");
    assert.equal(mobileTabId("/pricing"), "settings");
  });

  it("leaves the open surah and marketing landing without a tab", () => {
    assert.equal(mobileTabId("/"), null);
    assert.equal(mobileTabId("/read/1"), null);
    assert.equal(mobileTabId("/read/2?from=1&to=7"), null);
  });
});

describe("hideMobileTabs", () => {
  it("hides the bar on the landing page and while a surah is open", () => {
    assert.equal(hideMobileTabs("/"), true);
    assert.equal(hideMobileTabs("/read/1"), true);
    assert.equal(hideMobileTabs("/read/114?from=1&to=6&style=focus"), true);
  });

  it("shows the bar on the four hub tabs", () => {
    assert.equal(hideMobileTabs("/home"), false);
    assert.equal(hideMobileTabs("/practice"), false);
    assert.equal(hideMobileTabs("/listen"), false);
    assert.equal(hideMobileTabs("/settings"), false);
  });
});
