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
  wordTapIntent,
  playerPageKind,
  mushafMaskReveal,
  spanForVerse,
  spanForPlay,
  spanForSetup,
  indexOfVerseInPassage,
  verseRatioLabel,
  wordNeedsFollow,
  wordIsAway,
  wordRangePassComplete,
  wordRepsDoneState,
  emptyWordPick,
  wantsTranslation,
  buildRelayTurns,
  wordRepsPlayKind,
  mushafRepSpan,
  mushafPinHighlight,
  wrapRelayIndex,
  exclusiveJobPatch,
  exclusiveLayer,
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

describe("wordTapIntent", () => {
  it("opens the mushaf word sheet for any pointer, including Word Reps", () => {
    assert.equal(wordTapIntent("mushaf", "verse", "mouse"), "meaning");
    assert.equal(wordTapIntent("mushaf", "verse", "pen"), "meaning");
    assert.equal(wordTapIntent("mushaf", "verse", "touch"), "meaning");
    assert.equal(wordTapIntent("mushaf", "verse"), "meaning");
    assert.equal(wordTapIntent("mushaf", "word", "touch"), "meaning");
    assert.equal(wordTapIntent("mushaf", "masked", "mouse"), "meaning");
  });

  it("uses Word Reps taps for the pin bar, and plays in other Focus jobs", () => {
    assert.equal(wordTapIntent("focus", "word", "touch"), "wordRep");
    assert.equal(wordTapIntent("focus", "verse", "touch"), "play");
    assert.equal(wordTapIntent("focus", "masked", "mouse"), "play");
  });
});

describe("playerPageKind", () => {
  it("keeps Mushaf on screen for every drill", () => {
    assert.equal(playerPageKind("mushaf", "verse"), "mushaf");
    assert.equal(playerPageKind("mushaf", "word"), "mushaf");
    assert.equal(playerPageKind("mushaf", "masked"), "mushaf");
    assert.equal(playerPageKind("mushaf", "relay", true), "mushaf");
  });

  it("uses Focus stages only in Focus view", () => {
    assert.equal(playerPageKind("focus", "verse"), "focus");
    assert.equal(playerPageKind("focus", "word"), "word");
    assert.equal(playerPageKind("focus", "masked"), "masked");
    assert.equal(playerPageKind("focus", "relay", true), "relay");
    assert.equal(playerPageKind("focus", "relay", false), "focus");
  });
});

describe("mushafMaskReveal", () => {
  it("hides upcoming words and keeps past ayahs visible", () => {
    assert.deepEqual(
      mushafMaskReveal({
        mode: "verse",
        verseIdx: 0,
        currentIdx: 0,
        wordCount: 4,
        currentReveal: 1,
        verseDone: false,
      }),
      { masked: false, revealUpTo: 0 },
    );
    assert.deepEqual(
      mushafMaskReveal({
        mode: "masked",
        verseIdx: 1,
        currentIdx: 1,
        wordCount: 5,
        currentReveal: 2,
        verseDone: false,
      }),
      { masked: true, revealUpTo: 2 },
    );
    assert.deepEqual(
      mushafMaskReveal({
        mode: "masked",
        verseIdx: 0,
        currentIdx: 1,
        wordCount: 4,
        currentReveal: 0,
        verseDone: false,
      }),
      { masked: true, revealUpTo: 4 },
    );
    assert.deepEqual(
      mushafMaskReveal({
        mode: "masked",
        verseIdx: 2,
        currentIdx: 1,
        wordCount: 3,
        currentReveal: 1,
        verseDone: false,
      }),
      { masked: true, revealUpTo: 0 },
    );
  });
});

describe("spanForVerse", () => {
  it("loads a short surah whole and a long surah around the ayah", () => {
    assert.deepEqual(spanForVerse(2, 7), { from: 1, to: 7 });
    assert.deepEqual(spanForVerse(50, 286), { from: 50, to: 59 });
    assert.deepEqual(spanForVerse(1, 286), { from: 1, to: 10 });
  });
});

describe("spanForPlay", () => {
  it("opens the whole surah, including long ones", () => {
    assert.deepEqual(spanForPlay(7), { from: 1, to: 7 });
    assert.deepEqual(spanForPlay(286), { from: 1, to: 286 });
  });
});

describe("spanForSetup", () => {
  it("defaults to the whole surah and keeps a saved range", () => {
    assert.deepEqual(spanForSetup(286), { from: 1, to: 286 });
    assert.deepEqual(spanForSetup(286, { from: 2, to: 10 }), { from: 2, to: 10 });
    assert.deepEqual(spanForSetup(7, { from: 1, to: 20 }), { from: 1, to: 7 });
  });
});

describe("indexOfVerseInPassage", () => {
  const verses = [{ number: 1 }, { number: 2 }, { number: 3 }];
  it("finds an ayah already loaded, including the first one", () => {
    assert.equal(indexOfVerseInPassage(verses, 1, 1, 1, 3, 1), 0);
    assert.equal(indexOfVerseInPassage(verses, 1, 1, 1, 3, 3), 2);
  });
  it("asks for a navigation when the ayah is in another surah or outside the span", () => {
    assert.equal(indexOfVerseInPassage(verses, 2, 1, 1, 3, 1), -1);
    assert.equal(indexOfVerseInPassage(verses, 1, 1, 1, 3, 20), -1);
  });
});

describe("drillHint", () => {
  it("returns one line per drill type and nothing otherwise", () => {
    assert.equal(drillHint("word"), "Tap a word. Pin a range, or pick 5×, 10×, or ∞, then play.");
    assert.equal(drillHint("masked"), "Words stay in their slots and stay invisible until their turn.");
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

describe("exclusive jobs", () => {
  it("clears word reps when a verse loop takes over", () => {
    const next = exclusiveJobPatch("verseLoop");
    assert.equal(next.loop, null);
    assert.equal(next.pendingLoopStart, null);
    assert.equal(next.wordPick.start, null);
    assert.equal(next.wordStep.active, false);
    assert.equal("verseLoop" in next, false);
  });

  it("clears a verse loop when a word job takes over", () => {
    const next = exclusiveJobPatch("word");
    assert.equal(next.verseLoop, false);
    assert.equal(next.verseLoopRange, null);
    assert.equal("loop" in next, false);
  });

  it("clears every job when nothing is kept", () => {
    const next = exclusiveJobPatch();
    assert.equal(next.verseLoop, false);
    assert.equal(next.loop, null);
    assert.equal(next.oneshot, null);
    assert.equal(next.focusPhrase, 0);
  });
});

describe("exclusive layers", () => {
  it("keeps only the layer that just opened", () => {
    const settings = exclusiveLayer("settings");
    assert.equal(settings.size, 1);
    assert.equal(settings.has("settings"), true);
    assert.equal(settings.has("repeat"), false);
    assert.equal(settings.has("plus"), false);
    assert.equal(exclusiveLayer(null).size, 0);
  });
});

describe("word reps play kind", () => {
  it("marks one word as steps and a pin as a range", () => {
    assert.equal(wordRepsPlayKind(4, 4), "steps");
    assert.equal(wordRepsPlayKind(2, 5), "span");
    assert.equal(wordRepsPlayKind(5, 2), "span");
  });

  it("keeps single-word and range drivers exclusive", () => {
    // Contract for the player engine:
    // - steps → wbw clip (or Muallim oneshot fallback); never arms st.loop
    // - span  → continuous Muallim st.loop only; never arms wordStep.active
    // Arming both is what doubled passes and required two cancels.
    assert.notEqual(wordRepsPlayKind(3, 3), wordRepsPlayKind(3, 4));
  });
});

describe("mushafRepSpan", () => {
  it("replays the tapped word when nothing is pinned", () => {
    assert.deepEqual(mushafRepSpan(emptyWordPick(), 4), { start: 4, end: 4 });
    assert.deepEqual(mushafRepSpan(null, 1), { start: 1, end: 1 });
  });

  it("closes an open pin onto the word that gets 5× / 10× / ∞", () => {
    assert.deepEqual(
      mushafRepSpan({ start: 2, end: null }, 6),
      { start: 2, end: 6 },
    );
    assert.deepEqual(
      mushafRepSpan({ start: 6, end: null }, 2),
      { start: 2, end: 6 },
    );
  });

  it("keeps a completed pin even if another word is open", () => {
    assert.deepEqual(
      mushafRepSpan({ start: 2, end: 5 }, 9),
      { start: 2, end: 5 },
    );
  });

  it("treats pin-start on this same word as a single-word drill", () => {
    assert.deepEqual(
      mushafRepSpan({ start: 3, end: null }, 3),
      { start: 3, end: 3 },
    );
  });
});

describe("mushafPinHighlight", () => {
  it("underlines the first pin as pending on the current ayah", () => {
    assert.deepEqual(mushafPinHighlight(0, 0, { start: 4, end: null }), {
      start: 4,
      end: 4,
      pending: 4,
    });
    assert.equal(mushafPinHighlight(1, 0, { start: 4, end: null }), null);
  });

  it("underlines a completed pin as a range", () => {
    assert.deepEqual(mushafPinHighlight(0, 0, { start: 2, end: 5 }), {
      start: 2,
      end: 5,
      pending: 0,
    });
  });
});

describe("word reps done state", () => {
  it("clears the pin, loop, and word step so underlines do not stick", () => {
    const next = wordRepsDoneState();
    assert.equal(next.loop, null);
    assert.equal(next.playing, false);
    assert.equal(next.wordPick.start, null);
    assert.equal(next.wordPick.end, null);
    assert.equal(next.wordStep.active, false);
    assert.equal(next.wordStep.range, null);
    assert.deepEqual(next.wordPick, emptyWordPick());
  });
});

describe("buildRelayTurns", () => {
  const verses = [
    { number: 1, key: "1:1" },
    { number: 2, key: "1:2" },
    { number: 3, key: "1:3" },
  ];
  it("walks you and qari through the span and carries the last qari onto your seat", () => {
    const turns = buildRelayTurns(
      verses,
      1,
      3,
      [{ kind: "qari", reciterId: 7 }, { kind: "you" }],
      1,
      9,
    );
    assert.deepEqual(turns, [
      { kind: "qari", reciterId: 7, verseKey: "1:1" },
      { kind: "you", reciterId: 7, verseKey: "1:2" },
      { kind: "qari", reciterId: 7, verseKey: "1:3" },
    ]);
  });

  it("rotates the starting seat on later rounds", () => {
    const turns = buildRelayTurns(
      verses,
      1,
      2,
      [{ kind: "qari", reciterId: 7 }, { kind: "you" }],
      2,
      9,
    );
    assert.equal(turns[0].kind, "you");
    assert.equal(turns[1].kind, "qari");
  });
});

describe("relay skip", () => {
  it("moves to the next or previous seat and wraps inside the round", () => {
    assert.equal(wrapRelayIndex(0, 4, 1), 1);
    assert.equal(wrapRelayIndex(3, 4, 1), 0);
    assert.equal(wrapRelayIndex(0, 4, -1), 3);
    assert.equal(wrapRelayIndex(2, 4, -1), 1);
  });
});

describe("wordNeedsFollow", () => {
  it("asks to follow when the word leaves the pad inside the view", () => {
    assert.equal(wordNeedsFollow(80, 110, 0, 400, 48), false);
    assert.equal(wordNeedsFollow(10, 40, 0, 400, 48), true);
    assert.equal(wordNeedsFollow(370, 395, 0, 400, 48), true);
  });

  it("treats a word as away only when it leaves the view", () => {
    assert.equal(wordIsAway(10, 40, 0, 400, 8), false);
    assert.equal(wordIsAway(-30, -5, 0, 400, 8), true);
    assert.equal(wordIsAway(410, 430, 0, 400, 8), true);
  });
});
