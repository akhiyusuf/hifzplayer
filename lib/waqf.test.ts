import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Mark, Word } from "./types.ts";
import { isWaqfBreak, phrasesOf, splitByWaqf, waqfKind } from "./waqf.ts";

function word(pos: number, ar = "كَلِمَة"): Word {
  return { pos, ar, taj: null, gloss: "", tr: "" };
}

function mark(afterPos: number, ar: string, kind = "pause"): Mark {
  return { afterPos, ar, kind };
}

describe("waqf kinds", () => {
  it("treats meem, qila, jeem, and the dotted pause as breaks", () => {
    assert.equal(waqfKind("ۘ"), "break");
    assert.equal(waqfKind("ۗ"), "break");
    assert.equal(waqfKind("ۚ"), "break");
    assert.equal(waqfKind("ۛ"), "break");
    assert.equal(isWaqfBreak("ۚ"), true);
  });

  it("does not break on preferred continue or do-not-stop", () => {
    assert.equal(waqfKind("ۖ"), "hold");
    assert.equal(waqfKind("ۙ"), "hold");
    assert.equal(isWaqfBreak("ۖ"), false);
    assert.equal(isWaqfBreak("ۙ"), false);
  });
});

describe("splitByWaqf", () => {
  it("keeps a short ayah with no pauses as one phrase", () => {
    const phrases = splitByWaqf({
      words: [word(1), word(2), word(3)],
      marks: [mark(3, "١", "end")],
    });
    assert.equal(phrases.length, 1);
    assert.equal(phrases[0].length, 3);
  });

  it("splits after a jeem pause, not every six words", () => {
    const words = Array.from({ length: 14 }, (_, i) => word(i + 1));
    const phrases = splitByWaqf({
      words,
      marks: [mark(8, "ۚ"), mark(14, "٢", "end")],
    });
    assert.equal(phrases.length, 2);
    assert.deepEqual(
      phrases.map((p) => p.map((w) => w.pos)),
      [
        [1, 2, 3, 4, 5, 6, 7, 8],
        [9, 10, 11, 12, 13, 14],
      ],
    );
  });

  it("does not split at la or sala, even when those marks are present", () => {
    const phrases = splitByWaqf({
      words: [word(1), word(2), word(3), word(4)],
      marks: [mark(2, "ۙ"), mark(3, "ۖ")],
    });
    assert.equal(phrases.length, 1);
    assert.equal(phrases[0].length, 4);
  });

  it("splits when the pause glyph sits on the word itself", () => {
    const phrases = splitByWaqf({
      words: [word(1, "ءَامَنُوا۟"), word(2, "وَعَمِلُوا۟ۚ"), word(3, "الصَّالِحَاتِ")],
      marks: [],
    });
    assert.equal(phrases.length, 2);
    assert.equal(phrases[0][1].pos, 2);
    assert.equal(phrases[1][0].pos, 3);
  });

  it("caches on the verse object", () => {
    const verse = {
      key: "2:2",
      number: 2,
      words: [word(1), word(2)],
      marks: [mark(1, "ۛ")],
      translation: "",
      audio: null,
    };
    const first = phrasesOf(verse);
    const second = phrasesOf(verse);
    assert.equal(first, second);
    assert.equal(first.length, 2);
  });
});
