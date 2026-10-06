import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyUstadhReciteHighlight,
  emptyReciteHighlight,
  highlightAtStep,
  maxReachForVoiced,
  mergePeekHighlight,
  nextShownStep,
  peekHighlightFrom,
  pickForHighlight,
  reciteHighlightFromHeard,
  replaySpeakingHighlight,
  USTADH_PEEK,
  ustadhWordCss,
  type HighlightEngine,
} from "./highlight.ts";
import { expectedFromVerse } from "./units.ts";
import { fixturePassage } from "./fixtures/load.ts";

function verse(texts: string[], key = "1:2") {
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
    marks: [],
  };
}

function heard(words: string[], step = 0.4) {
  return words.map((word, index) => ({
    word,
    start: index * step,
    end: (index + 1) * step,
  }));
}

const fatiha2 = expectedFromVerse(verse(["ٱلْحَمْدُ", "لِلَّهِ", "رَبِّ", "ٱلْعَـٰلَمِينَ"]));

describe("reciteHighlightFromHeard", () => {
  it("advances through contiguous matches including dagger-alef العالمين", () => {
    const partial = reciteHighlightFromHeard({ words: fatiha2.words, heard: heard(["الحمد", "لله"]) });
    assert.equal(partial.matchedCount, 2);
    assert.equal(partial.matchedEndPos, 2);
    assert.equal(partial.missPos, null);
    assert.equal(partial.curPos, 3);
    assert.equal(partial.reach, 2);
    assert.equal(partial.complete, false);

    const full = reciteHighlightFromHeard({
      words: fatiha2.words,
      heard: heard(["الحمد", "لله", "رب", "العالمين"]),
    });
    assert.equal(full.matchedCount, 4);
    assert.equal(full.missPos, null);
    assert.equal(full.curPos, 4);
    assert.equal(full.complete, true);
  });

  it("final take flags a wrong last word on the frontier", () => {
    const miss = reciteHighlightFromHeard({
      words: fatiha2.words,
      heard: heard(["الحمد", "لله", "رب", "العالمون"]),
      final: true,
    });
    assert.equal(miss.matchedCount, 3);
    assert.equal(miss.missPos, 4);
    assert.deepEqual(miss.missPositions, [4]);
    assert.equal(miss.curPos, 4);
    assert.equal(miss.complete, false);
  });

  it("live peek treats a single wrong trailing token as still being spoken", () => {
    const peek = reciteHighlightFromHeard({
      words: fatiha2.words,
      heard: heard(["الحمد", "لله", "رب", "العا"]),
    });
    assert.equal(peek.reach, 3);
    assert.equal(peek.curPos, 4);
    assert.deepEqual(peek.missPositions, []);
  });

  it("live peek flags the frontier once unmatched tokens cover real time", () => {
    const peek = reciteHighlightFromHeard({
      words: fatiha2.words,
      heard: heard(["الحمد", "قال", "كان"], 1.5),
      clipSec: 4.6,
    });
    assert.equal(peek.reach, 1);
    assert.equal(peek.curPos, 2);
    assert.deepEqual(peek.missPositions, [2]);
  });

  it("does not flash an underline when a partial clip garbles one word (browser e2e)", () => {
    // Real Groq peek of the first ~1.5 s of Mishary's إِيَّاكَ: "إِنْ يَا كَنَ".
    const fatiha5 = fixturePassage("1:5");
    const peek = reciteHighlightFromHeard({
      words: fatiha5.words,
      heard: [
        { word: "إِنْ", start: 0.42, end: 0.9 },
        { word: "يَا", start: 0.9, end: 1.3 },
        { word: "كَنَ", start: 1.3, end: 1.9 },
      ],
      clipSec: 1.96,
    });
    assert.equal(peek.reach, 0);
    assert.deepEqual(peek.missPositions, []);
  });

  it("underlines a skipped word instead of silently passing it", () => {
    const peek = reciteHighlightFromHeard({
      words: fatiha2.words,
      heard: heard(["الحمد", "رب", "العالمين"]),
    });
    assert.equal(peek.reach, 4);
    assert.deepEqual(peek.missPositions, [2]);
    assert.equal(peek.missPos, 2);
    assert.equal(peek.matchedCount, 1, "contiguous run stops at the skip");
  });

  it("final take flags where the learner stopped short", () => {
    const stopped = reciteHighlightFromHeard({
      words: fatiha2.words,
      heard: heard(["الحمد", "لله"]),
      final: true,
    });
    assert.equal(stopped.reach, 2);
    assert.deepEqual(stopped.missPositions, [3]);
    assert.equal(stopped.complete, false);
  });

  it("caps live reach by voiced time (Whisper completing from the prompt)", () => {
    const hallucinated = heard(["الحمد", "لله", "رب", "العالمين"]);
    const capped = reciteHighlightFromHeard({ words: fatiha2.words, heard: hallucinated, maxReach: 2 });
    assert.equal(capped.reach, 2);
    assert.equal(capped.curPos, 3);
    assert.deepEqual(capped.missPositions, []);
    // Final takes ignore the cap.
    const final = reciteHighlightFromHeard({ words: fatiha2.words, heard: hallucinated, maxReach: 2, final: true });
    assert.equal(final.complete, true);
  });

  it("drops heard words that start after the uploaded clip ends", () => {
    const words = [
      { word: "الحمد", start: 0.2, end: 0.7 },
      { word: "لله", start: 0.8, end: 1.2 },
      { word: "رب", start: 2.9, end: 2.95 },
    ];
    const peek = reciteHighlightFromHeard({ words: fatiha2.words, heard: words, clipSec: 1.4 });
    assert.equal(peek.reach, 2);
  });

  it("live peek waits on a very short trailing word (cut-off or prompt-filled)", () => {
    const words = [
      { word: "الحمد", start: 0.2, end: 0.8 },
      { word: "لله", start: 0.8, end: 1.4 },
      { word: "رب", start: 1.4, end: 1.5 },
    ];
    assert.equal(reciteHighlightFromHeard({ words: fatiha2.words, heard: words }).reach, 2);
    assert.equal(reciteHighlightFromHeard({ words: fatiha2.words, heard: words, final: true }).reach, 3);
  });

  it("ignores Latin noise tokens", () => {
    const peek = reciteHighlightFromHeard({
      words: fatiha2.words,
      heard: heard(["al", "الحمد", "lillah", "لله"]),
    });
    assert.equal(peek.reach, 2);
    assert.deepEqual(peek.missPositions, []);
  });

  it("follows Whisper's split يا أيها on 2:21", () => {
    const passage = fixturePassage("2:21");
    const peek = reciteHighlightFromHeard({
      words: passage.words,
      heard: heard(["يا", "أيها", "الناس", "اعبدوا"]),
    });
    assert.equal(peek.reach, 3);
    assert.deepEqual(peek.missPositions, []);
  });

  it("returns a safe default for an empty passage", () => {
    const empty = reciteHighlightFromHeard({ words: [], heard: heard(["الحمد"]) });
    assert.equal(empty.curPos, 1);
    assert.equal(empty.reach, 0);
  });
});

describe("peek helpers", () => {
  it("maxReachForVoiced grows with voiced time", () => {
    assert.equal(maxReachForVoiced(0), USTADH_PEEK.reachSlack);
    assert.equal(maxReachForVoiced(1000), Math.floor(USTADH_PEEK.maxWordsPerSec) + USTADH_PEEK.reachSlack);
    assert.ok(maxReachForVoiced(4000) > maxReachForVoiced(2000));
    assert.equal(maxReachForVoiced(-50), USTADH_PEEK.reachSlack);
  });

  it("peekHighlightFrom applies the voiced cap", () => {
    const h = peekHighlightFrom({
      words: fatiha2.words,
      heard: heard(["الحمد", "لله", "رب", "العالمين"], 0.3),
      voicedMs: 300,
      clipSec: 1.3,
    });
    assert.equal(h.reach, maxReachForVoiced(300));
  });

  it("mergePeekHighlight never moves back during a take", () => {
    const a = reciteHighlightFromHeard({ words: fatiha2.words, heard: heard(["الحمد", "لله", "رب"]) });
    const worse = reciteHighlightFromHeard({ words: fatiha2.words, heard: heard(["الحمد"]) });
    const better = reciteHighlightFromHeard({
      words: fatiha2.words,
      heard: heard(["الحمد", "لله", "رب", "العالمين"]),
    });
    assert.equal(mergePeekHighlight(null, a), a);
    assert.equal(mergePeekHighlight(a, worse), a);
    assert.equal(mergePeekHighlight(a, better), better);
  });

  it("nextShownStep walks forward one word and jumps back", () => {
    assert.equal(nextShownStep(0, 3), 1);
    assert.equal(nextShownStep(2, 3), 3);
    assert.equal(nextShownStep(3, 3), 3);
    assert.equal(nextShownStep(4, 1), 1);
  });

  it("highlightAtStep hides misses ahead of the visible frontier", () => {
    const target = reciteHighlightFromHeard({
      words: fatiha2.words,
      heard: heard(["الحمد", "رب", "العالمين"]),
    });
    const s1 = highlightAtStep(target, fatiha2.words, 1);
    assert.equal(s1.curPos, 2);
    assert.deepEqual(s1.missPositions, []);
    const s2 = highlightAtStep(target, fatiha2.words, 2);
    assert.equal(s2.curPos, 3);
    assert.deepEqual(s2.missPositions, [2]);
    assert.equal(highlightAtStep(target, fatiha2.words, 9), target);
  });

  it("replaySpeakingHighlight marks the clip word and keeps misses", () => {
    const h = replaySpeakingHighlight(fatiha2.words, 3, [4]);
    assert.equal(h.curPos, 4);
    assert.deepEqual(h.missPositions, [4]);
  });
});

describe("ustadhWordCss", () => {
  it("styles misses and the word Ustadh is reciting by data-v/data-w", () => {
    const css = ustadhWordCss({ vIdx: 2, missPositions: [3, 5], speakingPos: 4 });
    assert.match(css, /\.w\[data-v="2"\]\[data-w="3"\]/);
    assert.match(css, /\.w\[data-v="2"\]\[data-w="5"\]/);
    assert.match(css, /underline wavy var\(--state-error\)/);
    assert.match(css, /\[data-w="4"\]\{[^}]*--state-success/);
  });

  it("emits nothing without a verse and rejects non-integer input", () => {
    assert.equal(ustadhWordCss({ vIdx: null, missPositions: [1] }), "");
    const css = ustadhWordCss({
      vIdx: 0,
      missPositions: ['1"]{}body{x:y' as unknown as number],
      speakingPos: 2.5,
    });
    assert.equal(css, "");
  });
});

describe("applyUstadhReciteHighlight", () => {
  function fakeEngine(style: "mushaf" | "focus") {
    const calls: string[] = [];
    const engine: HighlightEngine = {
      getSnapshot: () => ({ vIdx: 0 }),
      notify: () => calls.push("notify"),
      notifyWord: () => calls.push("notifyWord"),
      onWordChange: (verse, pos) => {
        // The real engine runs phrasesOf(verse): it must get the verse object, never an index.
        assert.equal(typeof verse, "object");
        assert.equal(verse.key, "1:2");
        calls.push(`word:${pos}`);
        if (style === "mushaf") calls.push("notifyWord");
        else calls.push("notify");
      },
      st: {
        curWord: 0,
        vIdx: 0,
        wordPick: { start: null, end: null, count: null, open: null, vIdx: null },
      },
    };
    return { engine, calls };
  }

  it("pins the recited range and re-renders the Mushaf when the pin changes", () => {
    const { engine, calls } = fakeEngine("mushaf");
    const h = reciteHighlightFromHeard({ words: fatiha2.words, heard: heard(["الحمد", "لله"]) });
    applyUstadhReciteHighlight(engine, 0, h, 1, { key: "1:2" });
    assert.equal(engine.st!.curWord, 3);
    assert.deepEqual(engine.st!.wordPick, { start: 1, end: 2, count: null, open: null, vIdx: 0 });
    assert.ok(calls.includes("word:3"));
    assert.ok(calls.includes("notify"), "full notify so the pin underline repaints in Mushaf");
  });

  it("Focus style: real engine phrase sync gets the verse object (regression: crashed on index)", async () => {
    const { phrasesOf } = await import("../waqf.ts");
    const v = { ...verse(["ٱلْحَمْدُ", "لِلَّهِ", "رَبِّ", "ٱلْعَـٰلَمِينَ"]), number: 2, translation: "", audio: null };
    let synced = -1;
    const engine: HighlightEngine = {
      getSnapshot: () => ({ vIdx: 0 }),
      notify: () => {},
      // Mirrors PlayerEngine.onWordChange → syncFocusPhrase(verse, pos).
      onWordChange: (target, pos) => {
        synced = phrasesOf(target as never).findIndex((ph) => pos >= ph[0]!.pos && pos <= ph[ph.length - 1]!.pos);
      },
      st: { curWord: 0, vIdx: 0, wordPick: { start: null, end: null, count: null, open: null, vIdx: null } },
    };
    const h = reciteHighlightFromHeard({ words: fatiha2.words, heard: heard(["الحمد"]) });
    applyUstadhReciteHighlight(engine, 0, h, 1, v);
    assert.equal(synced, 0);
  });

  it("skips repaint when nothing changed", () => {
    const { engine, calls } = fakeEngine("focus");
    const h = emptyReciteHighlight(fatiha2.words);
    applyUstadhReciteHighlight(engine, 0, h, 1, { key: "1:2" });
    const n = calls.length;
    applyUstadhReciteHighlight(engine, 0, h, 1, { key: "1:2" });
    assert.equal(calls.length, n);
  });

  it("pickForHighlight: pending pin on a first-word miss, cleared when nothing", () => {
    const miss = reciteHighlightFromHeard({ words: fatiha2.words, heard: heard(["قال", "كان"], 1.5), clipSec: 3.1 });
    assert.deepEqual(pickForHighlight(0, miss, 1), { start: 1, end: null, count: null, open: null, vIdx: 0 });
    assert.equal(pickForHighlight(0, emptyReciteHighlight(fatiha2.words), 1).start, null);
  });
});
