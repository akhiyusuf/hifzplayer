import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loopCountFace, nextLoopCount, verseRatioLabel } from "./player-chrome.ts";

describe("verseRatioLabel", () => {
  it("shows surah and ayah as a ratio", () => {
    assert.equal(verseRatioLabel("Al-Fatiha", 2, 7), "Al-Fatiha 2/7");
    assert.equal(verseRatioLabel("Al-Baqarah", 5, 286), "Al-Baqarah 5/286");
  });

  it("keeps the ayah at least 1 and the total at least the ayah", () => {
    assert.equal(verseRatioLabel("Al-Fatiha", 0, 7), "Al-Fatiha 1/7");
    assert.equal(verseRatioLabel("Al-Fatiha", 8, 7), "Al-Fatiha 8/8");
  });
});

describe("loop counts", () => {
  it("starts the face on 1 and cycles through the known counts", () => {
    assert.equal(loopCountFace(1), "1");
    assert.equal(loopCountFace(0), "∞");
    assert.equal(nextLoopCount(1), 2);
    assert.equal(nextLoopCount(2), 3);
    assert.equal(nextLoopCount(10), 0);
    assert.equal(nextLoopCount(0), 1);
    assert.equal(nextLoopCount(99), 1);
  });
});
