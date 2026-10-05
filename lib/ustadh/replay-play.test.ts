import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { replayWordIndexes } from "./replay-play.ts";
import { fixturePassage } from "./fixtures/load.ts";

describe("replayWordIndexes (what Ustadh highlights while reciting)", () => {
  const passage = fixturePassage("2:2");

  it("a word replay highlights exactly that word", () => {
    const decision = { action: "replay_word" as const, targetId: passage.words[3]!.targetId, wordIndex: 3 };
    assert.deepEqual(replayWordIndexes({ decision, words: passage.words, phrases: passage.phrases }), [3]);
  });

  it("slow_word resolves by targetId when wordIndex is missing", () => {
    const decision = { action: "slow_word" as const, targetId: passage.words[1]!.targetId };
    assert.deepEqual(replayWordIndexes({ decision, words: passage.words, phrases: passage.phrases }), [1]);
  });

  it("a phrase replay walks every word of the phrase in order", () => {
    const phrase = passage.phrases[0]!;
    const decision = { action: "replay_phrase" as const, targetId: phrase.id, phraseId: phrase.id, wordIndex: phrase.wordIndexes[0] };
    const order = replayWordIndexes({ decision, words: passage.words, phrases: passage.phrases });
    assert.deepEqual(order, phrase.wordIndexes);
    for (let i = 1; i < order.length; i++) assert.equal(order[i], order[i - 1]! + 1);
  });

  it("unknown targets highlight nothing", () => {
    const decision = { action: "replay_word" as const, targetId: "wbw/999_999_999.mp3" };
    assert.deepEqual(replayWordIndexes({ decision, words: passage.words, phrases: passage.phrases }), []);
  });
});
