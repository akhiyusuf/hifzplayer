import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  coversRange,
  drillHint,
  loopCountFace,
  nextLoopCount,
  nextRate,
  nextVerseInLoop,
  nextWordInRange,
  rateFace,
  sidebarKind,
  sortedWordRange,
  spanForVerse,
  verseRatioLabel,
  wordNeedsFollow,
  wordRangePassComplete,
  wordRepsPlayKind,
} from "./player-chrome.ts";

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

describe("sidebarKind", () => {
  it("splits mushaf, empty Focus, and each drill type", () => {
    assert.equal(sidebarKind("mushaf", "verse"), "mushaf");
    assert.equal(sidebarKind("mushaf", "word"), "mushaf");
    assert.equal(sidebarKind("focus", "verse"), "focus");
    assert.equal(sidebarKind("focus", "word"), "word");
    assert.equal(sidebarKind("focus", "masked"), "masked");
    assert.equal(sidebarKind("focus", "relay"), "relay");
  });
});

describe("spanForVerse", () => {
  it("loads a short surah whole and a long surah around the ayah", () => {
    assert.deepEqual(spanForVerse(2, 7), { from: 1, to: 7 });
    assert.deepEqual(spanForVerse(50, 286), { from: 50, to: 59 });
    assert.deepEqual(spanForVerse(1, 286), { from: 1, to: 10 });
  });
});

describe("drillHint", () => {
  it("returns one line per drill type and nothing otherwise", () => {
    assert.equal(drillHint("word"), "Tap a word. Pin a range, or pick 5×, 10×, or ∞, then play.");
    assert.equal(drillHint("masked"), "Words are covered. Peek if you need a look.");
    assert.equal(drillHint("relay"), "Recite your ayah. The reciter takes the next.");
    assert.equal(drillHint("verse"), "");
    assert.equal(drillHint("mushaf"), "");
  });
});

describe("coversRange", () => {
  it("requires every ayah in the span to be loaded", () => {
    const verses = [{ number: 1 }, { number: 2 }, { number: 3 }];
    assert.equal(coversRange(verses, 1, 3), true);
    assert.equal(coversRange(verses, 1, 4), false);
    assert.equal(coversRange(verses, 2, 1), false);
  });
});

describe("word range helpers", () => {
  it("sorts pins and walks a pass, then the next verse in a free Repeat range", () => {
    assert.deepEqual(sortedWordRange(5, 2), { start: 2, end: 5 });
    assert.equal(nextWordInRange(2, 5), 3);
    assert.equal(nextWordInRange(5, 5), null);
    assert.equal(wordRangePassComplete(4, 5), false);
    assert.equal(wordRangePassComplete(5, 5), true);
    assert.equal(wordRangePassComplete(99, 0), false);
    assert.equal(nextVerseInLoop(3, 1, 7), 4);
    assert.equal(nextVerseInLoop(7, 1, 7), 1);
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

describe("playback rate", () => {
  it("shows a multiplier and walks 0.75 → 1 → 1.25 → 1.5", () => {
    assert.equal(rateFace(1), "1×");
    assert.equal(rateFace(1.25), "1.25×");
    assert.equal(rateFace(0.75), "0.75×");
    assert.equal(rateFace(0), "1×");
    assert.equal(nextRate(0.75), 1);
    assert.equal(nextRate(1), 1.25);
    assert.equal(nextRate(1.25), 1.5);
    assert.equal(nextRate(1.5), 0.75);
    assert.equal(nextRate(99), 1);
  });
});

describe("word reps play kind", () => {
  it("steps one word and plays a pinned range as one span", () => {
    assert.equal(wordRepsPlayKind(4, 4), "steps");
    assert.equal(wordRepsPlayKind(2, 5), "span");
    assert.equal(wordRepsPlayKind(5, 2), "span");
  });
});

describe("wordNeedsFollow", () => {
  it("asks to follow when the word leaves the pad inside the view", () => {
    assert.equal(wordNeedsFollow(80, 110, 0, 400, 48), false);
    assert.equal(wordNeedsFollow(10, 40, 0, 400, 48), true);
    assert.equal(wordNeedsFollow(370, 395, 0, 400, 48), true);
  });
});
