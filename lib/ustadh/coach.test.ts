import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  coachPayloadForVerse,
  mapClientErrorCode,
  mergeMissCounts,
  pickCoachVerse,
  primaryReplay,
  turnOutcome,
  ustadhErrorHint,
  ustadhStatusLabel,
} from "./coach.ts";
import type { UstadhAsrResponse } from "./types.ts";

const fatiha2 = {
  key: "1:2",
  number: 2,
  words: [
    { pos: 1, ar: "ٱلْحَمْدُ", taj: null, gloss: "", tr: "", audio: "wbw/001_002_001.mp3" },
    { pos: 2, ar: "لِلَّهِ", taj: null, gloss: "", tr: "", audio: "wbw/001_002_002.mp3" },
    { pos: 3, ar: "رَبِّ", taj: null, gloss: "", tr: "", audio: "wbw/001_002_003.mp3" },
    { pos: 4, ar: "ٱلْعَٰلَمِينَ", taj: null, gloss: "", tr: "", audio: "wbw/001_002_004.mp3" },
  ],
  marks: [],
  translation: "",
  audio: null,
};

describe("ustadh coach helpers", () => {
  it("skips Al-Fatiha 1:1 when 1:2 is in the passage", () => {
    const verses = [
      { ...fatiha2, key: "1:1", number: 1 },
      fatiha2,
    ];
    assert.equal(pickCoachVerse(verses, 0)?.key, "1:2");
    assert.equal(pickCoachVerse(verses, 1)?.key, "1:2");
  });

  it("builds expected text and wbw-ready words for a verse", () => {
    const payload = coachPayloadForVerse(fatiha2);
    assert.match(payload.expectedText, /ٱلْحَمْدُ/);
    assert.equal(payload.verseKey, "1:2");
    assert.equal(payload.surah, 1);
    assert.equal(payload.ayahStart, 2);
    assert.equal(payload.expectedWords.length, 4);
    assert.equal(payload.expectedWords[0].audio, "wbw/001_002_001.mp3");
  });

  it("labels statuses and maps error codes", () => {
    assert.equal(ustadhStatusLabel("listening"), "Listening…");
    assert.equal(ustadhStatusLabel("error", "ASR_NOT_CONFIGURED"), "Coach offline");
    assert.match(ustadhErrorHint("MIC_DENIED"), /microphone/i);
    assert.equal(mapClientErrorCode("ASR_NOT_CONFIGURED"), "ASR_NOT_CONFIGURED");
    assert.equal(mapClientErrorCode(undefined, 0), "NETWORK");
  });

  it("merges miss counts and picks the primary replay", () => {
    const response: UstadhAsrResponse = {
      model: "whisper-large-v3-turbo",
      language: "ar",
      transport: "chunked",
      text: "x",
      words: [],
      interrupts: [{ type: "word", expected: "ٱلْعَٰلَمِينَ", wordIndex: 3 }],
      replays: [
        {
          action: "replay_word",
          targetId: "wbw/001_002_004.mp3",
          wordIndex: 3,
          missCount: 1,
          pos: 4,
          verseKey: "1:2",
        },
      ],
    };
    assert.equal(turnOutcome(response), "miss");
    assert.equal(primaryReplay(response)?.targetId, "wbw/001_002_004.mp3");
    assert.deepEqual(mergeMissCounts({}, response.replays), {
      "wbw/001_002_004.mp3": 1,
    });
    assert.equal(turnOutcome({ ...response, interrupts: [], replays: [] }), "matched");
  });


  it("prefers sticky word replay over phrase restart", () => {
    const response: UstadhAsrResponse = {
      model: "whisper-large-v3-turbo",
      language: "ar",
      transport: "chunked",
      text: "x",
      words: [],
      interrupts: [{ type: "phrase", expected: "…", wordIndex: 0 }],
      replays: [
        {
          action: "replay_phrase",
          targetId: "1:2:p0",
          wordIndex: 0,
          missCount: 1,
          phraseId: "1:2:p0",
        },
        {
          action: "slow_word",
          targetId: "wbw/001_002_004.mp3",
          wordIndex: 3,
          missCount: 2,
          pos: 4,
          verseKey: "1:2",
        },
      ],
    };
    assert.equal(primaryReplay(response)?.action, "slow_word");
    assert.equal(primaryReplay(response)?.wordIndex, 3);
  });

  it("labels the replaying state", () => {
    assert.equal(ustadhStatusLabel("replaying"), "Ustadh reciting…");
  });
});

describe("primaryReplay pin-to-word", () => {
  const base: Omit<UstadhAsrResponse, "interrupts" | "replays"> = {
    model: "whisper-large-v3-turbo",
    language: "ar",
    transport: "chunked",
    text: "x",
    words: [],
  };
  const word = (wordIndex: number, extra: Partial<UstadhAsrResponse["replays"][number]> = {}) => ({
    action: "replay_word" as const,
    targetId: `wbw/001_007_00${wordIndex + 1}.mp3`,
    wordIndex,
    missCount: 1,
    pos: wordIndex + 1,
    verseKey: "1:7",
    ...extra,
  });

  it("returns null when there is nothing to replay", () => {
    assert.equal(primaryReplay({ ...base, interrupts: [], replays: [] }), null);
  });

  it("picks the earliest word replay regardless of response order", () => {
    const r = primaryReplay({ ...base, interrupts: [], replays: [word(5), word(2), word(7)] });
    assert.equal(r?.wordIndex, 2);
  });

  it("prefers a word replay over a phrase restart", () => {
    const r = primaryReplay({
      ...base,
      interrupts: [{ type: "phrase", expected: "…", wordIndex: 0 }],
      replays: [
        { action: "replay_phrase", targetId: "1:7:p0", phraseId: "1:7:p0", wordIndex: 0, missCount: 1 },
        word(4),
      ],
    });
    assert.equal(r?.action, "replay_word");
    assert.equal(r?.wordIndex, 4);
  });

  it("pins a sticky phrase miss (missCount ≥ 2) to a slow word clip", () => {
    const r = primaryReplay({
      ...base,
      interrupts: [],
      replays: [{ action: "replay_phrase", targetId: "1:7:p0", phraseId: "1:7:p0", wordIndex: 3, missCount: 2 }],
    });
    assert.equal(r?.action, "slow_word");
    assert.equal(r?.wordIndex, 3);
  });

  it("earliest sticky word wins over an earlier first-time miss", () => {
    const r = primaryReplay({
      ...base,
      interrupts: [],
      replays: [word(1), word(6, { action: "slow_word", missCount: 2 })],
    });
    assert.equal(r?.action, "slow_word");
    assert.equal(r?.wordIndex, 6);
  });

  it("falls back to the first interrupt's replay, then the first replay", () => {
    const phraseOnly = primaryReplay({
      ...base,
      interrupts: [{ type: "phrase", expected: "…", wordIndex: 4 }],
      replays: [
        { action: "replay_phrase", targetId: "1:7:p0", phraseId: "1:7:p0", wordIndex: 0, missCount: 1 },
        { action: "replay_phrase", targetId: "1:7:p1", phraseId: "1:7:p1", wordIndex: 4, missCount: 1 },
      ],
    });
    assert.equal(phraseOnly?.targetId, "1:7:p1");
    const noInterrupt = primaryReplay({
      ...base,
      interrupts: [],
      replays: [{ action: "replay_phrase", targetId: "1:7:p0", phraseId: "1:7:p0", wordIndex: 0, missCount: 1 }],
    });
    assert.equal(noInterrupt?.targetId, "1:7:p0");
  });

  it("end-to-end: a repeated miss on العالمين replays that word slowly", async () => {
    const { assessUstadhTurn } = await import("./turn.ts");
    const payload = coachPayloadForVerse(fatiha2);
    const heard = ["الحمد", "لله", "رب", "العالمون"].map((w, i) => ({ word: w, start: i, end: i + 0.5 }));
    const first = assessUstadhTurn({ words: payload.words, phrases: payload.phrases, heard });
    const pick1 = primaryReplay({ ...base, ...first });
    assert.equal(pick1?.action, "replay_word");
    assert.equal(pick1?.pos, 4);
    const counts = mergeMissCounts({}, first.replays);
    const second = assessUstadhTurn({ words: payload.words, phrases: payload.phrases, heard, missCounts: counts });
    const pick2 = primaryReplay({ ...base, ...second });
    assert.equal(pick2?.action, "slow_word");
    assert.equal(pick2?.pos, 4);
  });
});
