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
});
