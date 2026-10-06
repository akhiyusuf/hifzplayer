import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AsrWord } from "./types.ts";
import { assessUstadhTurn } from "./turn.ts";
import { expectedFromRawWords, expectedFromVerse, rangesFromAnnotation, wbwClipId } from "./units.ts";

function heard(words: string[], step = 0.5): AsrWord[] {
  return words.map((word, index) => ({
    word,
    start: index * step,
    end: (index + 1) * step,
  }));
}

function verse(key: string, texts: string[], marks: { afterPos: number; ar: string; kind?: string }[] = []) {
  return {
    key,
    words: texts.map((ar, index) => ({
      pos: index + 1,
      ar,
      taj: null,
      gloss: "",
      tr: "",
      audio: null as string | null,
    })),
    marks: marks.map((mark) => ({ afterPos: mark.afterPos, ar: mark.ar, kind: mark.kind || "pause" })),
  };
}

describe("assessUstadhTurn", () => {
  it("accepts a diacritic-only difference", () => {
    const passage = expectedFromVerse(
      verse("1:1", ["بِسْمِ", "ٱللَّهِ", "ٱلرَّحْمَٰنِ", "ٱلرَّحِيمِ"]),
    );
    const result = assessUstadhTurn({
      ...passage,
      heard: heard(["بسم", "الله", "الرحمن", "الرحيم"]),
    });
    assert.deepEqual(result.interrupts, []);
    assert.deepEqual(result.replays, []);
  });

  
  it("accepts ASR العالمين for dagger-alef ٱلْعَٰلَمِينَ", () => {
    const passage = expectedFromVerse(verse("1:2", ["ٱلْحَمْدُ", "لِلَّهِ", "رَبِّ", "ٱلْعَٰلَمِينَ"]));
    const result = assessUstadhTurn({
      ...passage,
      heard: heard(["الحمد", "لله", "رب", "العالمين"]),
    });
    assert.deepEqual(result.interrupts, []);
    assert.deepEqual(result.replays, []);
  });

it("replays one word on a single miss", () => {
    const passage = expectedFromVerse(verse("1:2", ["ٱلْحَمْدُ", "لِلَّهِ", "رَبِّ", "ٱلْعَٰلَمِينَ"]));
    const result = assessUstadhTurn({
      ...passage,
      heard: heard(["الحمد", "لله", "رب", "العالمون"]),
    });
    assert.equal(result.interrupts.length, 1);
    assert.equal(result.interrupts[0].type, "word");
    assert.equal(result.interrupts[0].expected, "ٱلْعَٰلَمِينَ");
    assert.equal(result.interrupts[0].heard, "العالمون");
    assert.equal(result.replays.length, 1);
    assert.equal(result.replays[0].action, "replay_word");
    assert.equal(result.replays[0].targetId, "wbw/001_002_004.mp3");
    assert.equal(result.replays[0].wordIndex, 3);
    assert.equal(result.replays[0].pos, 4);
    assert.equal(result.replays[0].missCount, 1);
    assert.equal(result.replays[0].phraseId, "1:2:p0");
  });

  it("slows the same word after a repeated miss", () => {
    const passage = expectedFromVerse(verse("1:2", ["ٱلْحَمْدُ", "لِلَّهِ", "رَبِّ", "ٱلْعَٰلَمِينَ"]));
    const targetId = "wbw/001_002_004.mp3";
    const result = assessUstadhTurn({
      ...passage,
      heard: heard(["الحمد", "لله", "رب", "غلط"]),
      missCounts: { [targetId]: 1 },
    });
    assert.equal(result.interrupts[0].type, "word");
    assert.equal(result.replays[0].action, "slow_word");
    assert.equal(result.replays[0].targetId, targetId);
    assert.equal(result.replays[0].missCount, 2);
  });

  it("replays the waqf phrase and does not cut a long ayah at six words", () => {
    const letters = ["ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س", "ش", "ص", "ض"];
    const texts = letters.slice(0, 14);
    const passage = expectedFromVerse(
      verse(
        "2:255",
        texts,
        [
          { afterPos: 8, ar: "ۚ" },
          { afterPos: 14, ar: "٢", kind: "end" },
        ],
      ),
    );
    assert.deepEqual(
      passage.phrases.map((phrase) => phrase.wordIndexes.length),
      [8, 6],
    );
    const said = texts.map((word) => word);
    said[8] = "لا";
    said[9] = "كلا";
    const result = assessUstadhTurn({ ...passage, heard: heard(said) });
    assert.equal(result.interrupts.length, 1);
    assert.equal(result.interrupts[0].type, "phrase");
    assert.equal(result.interrupts[0].phraseId, "2:255:p1");
    assert.equal(result.interrupts[0].expected, texts.slice(8).join(" "));
    assert.equal(result.replays.length, 2);
    for (const decision of result.replays) {
      assert.equal(decision.action, "replay_phrase");
      assert.equal(decision.targetId, "2:255:p1");
      assert.equal(decision.phraseId, "2:255:p1");
      assert.ok((decision.wordIndex ?? 0) >= 8);
    }
    assert.equal(result.replays.some((decision) => (decision.wordIndex ?? 0) < 8), false);
  });

  it("keeps a pause-less ayah as one phrase", () => {
    const texts = ["ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز"];
    const passage = expectedFromVerse(verse("36:1", texts));
    assert.equal(passage.phrases.length, 1);
    assert.equal(passage.phrases[0].wordIndexes.length, 10);
    const said = texts.slice();
    said[2] = "لا";
    said[3] = "كلا";
    const result = assessUstadhTurn({ ...passage, heard: heard(said) });
    assert.equal(result.interrupts[0].type, "phrase");
    assert.equal(result.interrupts[0].expected, texts.join(" "));
    assert.equal(result.replays[0].targetId, "36:1:p0");
  });

  it("flags the ayah when every word is wrong", () => {
    const passage = expectedFromVerse(verse("112:1", ["قُلْ", "هُوَ", "ٱللَّهُ", "أَحَدٌ"]));
    const result = assessUstadhTurn({
      ...passage,
      heard: heard(["لا", "لا", "لا", "لا"]),
    });
    assert.equal(result.interrupts.length, 1);
    assert.equal(result.interrupts[0].type, "ayah");
    assert.equal(result.interrupts[0].verseKey, "112:1");
    assert.equal(result.replays.length, 4);
    assert.equal(result.replays.every((decision) => decision.action === "replay_phrase"), true);
  });

  it("builds a word-by-word clip id and keeps a caller-supplied clip", () => {
    assert.equal(wbwClipId("1:1", 1), "wbw/001_001_001.mp3");
    const passage = expectedFromRawWords([{ pos: 1, ar: "قُلْ", verseKey: "112:1", audio: "wbw/custom.mp3" }], {
      fallbackVerseKey: "112:1",
    });
    assert.equal(passage.words[0].targetId, "wbw/custom.mp3");
  });

  it("replays an explicit phrase range without the words after it", () => {
    const passage = expectedFromRawWords(
      [
        { pos: 1, ar: "ٱهْدِنَا", verseKey: "1:6" },
        { pos: 2, ar: "ٱلصِّرَٰطَ", verseKey: "1:6" },
        { pos: 3, ar: "ٱلْمُسْتَقِيمَ", verseKey: "1:6" },
        { pos: 4, ar: "صِرَاطَ", verseKey: "1:6" },
        { pos: 5, ar: "ٱلَّذِينَ", verseKey: "1:6" },
      ],
      {
        fallbackVerseKey: "1:6",
        phrases: [{ id: "1:6:16552", verseKey: "1:6", from: 1, to: 3 }],
      },
    );
    assert.deepEqual(passage.phrases[0].wordIndexes, [0, 1, 2]);
    const result = assessUstadhTurn({
      ...passage,
      heard: heard(["لا", "كلا", "خطأ", "صراط", "الذين"]),
    });
    assert.equal(result.interrupts.length, 1);
    assert.equal(result.interrupts[0].type, "phrase");
    assert.equal(result.interrupts[0].phraseId, "1:6:16552");
    assert.equal(result.interrupts[0].expected, "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ");
    assert.equal(result.replays.length, 3);
    assert.equal(
      result.replays.every((decision) => decision.action === "replay_phrase" && decision.targetId === "1:6:16552"),
      true,
    );
  });

  it("maps a mutashabihat row onto phrase bounds", () => {
    const ranges = rangesFromAnnotation("1:6", [{ g: "16552", f: 1, t: 3 }]);
    assert.deepEqual(ranges, [{ id: "1:6:16552", verseKey: "1:6", from: 1, to: 3 }]);
  });
});
