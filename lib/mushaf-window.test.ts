import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isHotVerse,
  rangeAround,
  viewFromVisible,
} from "./mushaf-window.ts";

describe("mushaf hot window", () => {
  it("keeps a pad around the playing verse", () => {
    const play = rangeAround(286, 0, 10);
    assert.deepEqual(play, { start: 0, end: 11 });
    const mid = rangeAround(286, 140, 10);
    assert.equal(mid.start, 130);
    assert.equal(mid.end, 151);
  });

  it("does not mark a far-away verse hot just because two windows exist", () => {
    const play = rangeAround(286, 0, 10);
    const view = viewFromVisible(286, 200, 208, 6);
    assert.equal(isHotVerse(0, play, view), true);
    assert.equal(isHotVerse(204, play, view), true);
    assert.equal(isHotVerse(40, play, view), false);
    assert.equal(isHotVerse(180, play, view), false);
  });

  it("clamps a scrolled view to the surah", () => {
    const view = viewFromVisible(286, 280, 285, 6);
    assert.equal(view.start, 274);
    assert.equal(view.end, 286);
  });
});
