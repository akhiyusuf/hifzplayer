import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alignPrefix, alignWords, flaggedExpectedIndexes, heardIndexesCovering, type AlignOp } from "./interrupt.ts";

const fatiha2 = ["ٱلْحَمْدُ", "لِلَّهِ", "رَبِّ", "ٱلْعَـٰلَمِينَ"];
const fatiha5 = ["إِيَّاكَ", "نَعْبُدُ", "وَإِيَّاكَ", "نَسْتَعِينُ"];
const baqarah21 = ["يَـٰٓأَيُّهَا", "ٱلنَّاسُ", "ٱعْبُدُوا۟", "رَبَّكُمُ"];

function kinds(ops: AlignOp[]) {
  return ops.map((op) => (op.kind === "ins" ? "ins" : `${op.kind}:${op.expectedIndex}`));
}

describe("alignWords (final take)", () => {
  it("matches a clean take word for word", () => {
    const ops = alignWords(fatiha2, ["الحمد", "لله", "رب", "العالمين"]);
    assert.deepEqual(kinds(ops), ["match:0", "match:1", "match:2", "match:3"]);
    assert.deepEqual(flaggedExpectedIndexes(ops), []);
  });

  it("flags a skipped middle word as a deletion, not a substitution chain", () => {
    const ops = alignWords(fatiha2, ["الحمد", "رب", "العالمين"]);
    assert.deepEqual(kinds(ops), ["match:0", "del:1", "match:2", "match:3"]);
    assert.deepEqual(flaggedExpectedIndexes(ops), [1]);
  });

  it("puts a wrong word on its own slot and leaves the trailing gap at the end", () => {
    const ops = alignWords(fatiha2, ["الحمد", "لله", "ربي"]);
    assert.deepEqual(kinds(ops), ["match:0", "match:1", "sub:2", "del:3"]);
  });

  it("keeps repeated words in order (إياك … وإياك)", () => {
    const ops = alignWords(fatiha5, ["اياك", "نعبد", "واياك", "نستعين"]);
    assert.deepEqual(flaggedExpectedIndexes(ops), []);
    const skipFirst = alignWords(fatiha5, ["نعبد", "واياك", "نستعين"]);
    assert.deepEqual(flaggedExpectedIndexes(skipFirst), [0]);
  });

  it("accepts Whisper splitting يَـٰٓأَيُّهَا into يا أيها", () => {
    const ops = alignWords(baqarah21, ["يا", "أيها", "الناس", "اعبدوا", "ربكم"]);
    assert.deepEqual(flaggedExpectedIndexes(ops), []);
    const joined = ops.find((op) => op.kind === "ins");
    assert.ok(joined && joined.kind === "ins" && joined.joined, "split half is a joined insertion");
  });

  it("accepts Whisper gluing two words into one", () => {
    const ops = alignWords(["لَا", "رَيْبَ", "فِيهِ"], ["لاريب", "فيه"]);
    assert.deepEqual(flaggedExpectedIndexes(ops), []);
    // Both glued words point at the same heard token; covering stays deduped.
    assert.deepEqual(heardIndexesCovering(ops, new Set([0, 1])), [0]);
  });

  it("does not accept a split that spells a different word", () => {
    const ops = alignWords(baqarah21, ["يا", "أيتها", "الناس", "اعبدوا", "ربكم"]);
    assert.ok(flaggedExpectedIndexes(ops).includes(0));
  });

  it("handles empty sides", () => {
    assert.deepEqual(kinds(alignWords([], ["x"])), ["ins"]);
    assert.deepEqual(kinds(alignWords(["رب"], [])), ["del:0"]);
  });
});

describe("alignPrefix (live take)", () => {
  it("stops at the words actually heard (no trailing deletions)", () => {
    const { ops, reach, cost } = alignPrefix(fatiha2, ["الحمد", "لله"]);
    assert.equal(reach, 2);
    assert.equal(cost, 0);
    assert.deepEqual(kinds(ops), ["match:0", "match:1"]);
  });

  it("treats an unmatched last token as not-yet-reached (shortest prefix on ties)", () => {
    const { ops, reach } = alignPrefix(fatiha2, ["الحمد", "لله", "رَ"]);
    assert.equal(reach, 2);
    assert.deepEqual(kinds(ops), ["match:0", "match:1", "ins"]);
  });

  it("needs two later words before it concludes a word was skipped", () => {
    // One unmatched token after الحمد: could be noise or a cut-off word → stay put.
    const one = alignPrefix(fatiha2, ["الحمد", "رب"]);
    assert.equal(one.reach, 1);
    // رب العالمين confirms the learner moved on → reach the end, لله is a deletion.
    const two = alignPrefix(fatiha2, ["الحمد", "رب", "العالمين"]);
    assert.equal(two.reach, 4);
    assert.deepEqual(kinds(two.ops), ["match:0", "del:1", "match:2", "match:3"]);
  });

  it("does not jump to a far repeat of a common word", () => {
    // ٱلَّذِينَ appears at index 1 and the learner is only at word 1.
    const fatiha7 = ["صِرَٰطَ", "ٱلَّذِينَ", "أَنْعَمْتَ", "عَلَيْهِمْ", "غَيْرِ", "ٱلْمَغْضُوبِ", "عَلَيْهِمْ"];
    const { reach } = alignPrefix(fatiha7, ["صراط", "الذين", "انعمت", "عليهم"]);
    assert.equal(reach, 4, "first عليهم, not the repeat at index 6");
  });
});
