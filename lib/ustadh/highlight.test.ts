import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reciteHighlightFromHeard } from "./highlight.ts";
import { expectedFromVerse } from "./units.ts";

function verse(texts: string[]) {
  return {
    key: "1:2",
    words: texts.map((ar, index) => ({
      pos: index + 1,
      ar,
      taj: null,
      gloss: "",
      tr: "",
      audio: null as string | null,
    })),
    marks: [],
  };
}

function heard(words: string[]) {
  return words.map((word, index) => ({
    word,
    start: index * 0.4,
    end: (index + 1) * 0.4,
  }));
}

describe("reciteHighlightFromHeard", () => {
  it("advances through contiguous matches including dagger-alef العالمين", () => {
    const passage = expectedFromVerse(
      verse(["ٱلْحَمْدُ", "لِلَّهِ", "رَبِّ", "ٱلْعَٰلَمِينَ"]),
    );
    const partial = reciteHighlightFromHeard({
      words: passage.words,
      heard: heard(["الحمد", "لله"]),
    });
    assert.equal(partial.matchedCount, 2);
    assert.equal(partial.matchedEndPos, 2);
    assert.equal(partial.missPos, null);
    assert.equal(partial.curPos, 3);

    const full = reciteHighlightFromHeard({
      words: passage.words,
      heard: heard(["الحمد", "لله", "رب", "العالمين"]),
    });
    assert.equal(full.matchedCount, 4);
    assert.equal(full.missPos, null);
    assert.equal(full.curPos, 4);

    const miss = reciteHighlightFromHeard({
      words: passage.words,
      heard: heard(["الحمد", "لله", "رب", "العالمون"]),
    });
    assert.equal(miss.matchedCount, 3);
    assert.equal(miss.missPos, 4);
    assert.equal(miss.curPos, 4);
  });
});
