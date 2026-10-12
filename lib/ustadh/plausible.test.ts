import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { plausibleAsrWords } from "./plausible.ts";

const w = (word: string, start: number, end: number) => ({ word, start, end });

describe("plausibleAsrWords (prompt hallucination guard)", () => {
  it("drops the squeezed run Groq produced for 1:5 with وَإِيَّاكَ cut out", () => {
    // Verbatim timings from a real Groq response (full-ayah prompt).
    const heard = [
      w("إِيَّاكَ", 0.4, 1.28),
      w("نَعْبُدُ", 1.28, 2.1),
      w("وَإِيَّاكَ", 2.1, 2.2),
      w("نَعْبُدُ", 2.2, 2.22),
      w("وَإِيَّاكَ", 2.22, 2.32),
      w("نَسْتَعِينُ", 2.32, 4.06),
    ];
    assert.deepEqual(
      plausibleAsrWords(heard).map((x) => x.word),
      ["إِيَّاكَ", "نَعْبُدُ", "نَسْتَعِينُ"],
    );
  });

  it("drops a word stretched far past the end of the clip", () => {
    const heard = [w("إياك", 0.02, 1.28), w("نعبد", 1.28, 2.12), w("نستعين", 2.2, 6.48)];
    assert.deepEqual(plausibleAsrWords(heard, { clipSec: 3.2 }).map((x) => x.word), ["إياك", "نعبد"]);
    // Without a clip length the stretched word stays (cannot tell).
    assert.equal(plausibleAsrWords(heard).length, 3);
  });

  it("drops words starting after the clip, honouring chunkStart offsets", () => {
    const heard = [w("الحمد", 10.2, 10.7), w("لله", 10.8, 11.2), w("رب", 13.5, 13.9)];
    assert.deepEqual(plausibleAsrWords(heard, { clipSec: 1.5, chunkStart: 10 }).map((x) => x.word), ["الحمد", "لله"]);
  });

  it("keeps one short real word (لا, من) between normal words", () => {
    const heard = [w("ذلك", 0, 0.6), w("الكتاب", 0.6, 1.4), w("لا", 1.4, 1.52), w("ريب", 1.52, 2.1)];
    assert.equal(plausibleAsrWords(heard).length, 4);
  });

  it("drops an impossible 20 ms word even alone", () => {
    const heard = [w("الحمد", 0, 0.6), w("لله", 0.6, 0.62), w("رب", 0.7, 1.2)];
    assert.deepEqual(plausibleAsrWords(heard).map((x) => x.word), ["الحمد", "رب"]);
  });

  it("keeps words without usable timestamps", () => {
    const heard = [{ word: "الحمد", start: Number.NaN, end: Number.NaN }];
    assert.equal(plausibleAsrWords(heard, { clipSec: 1 }).length, 1);
    assert.deepEqual(plausibleAsrWords([]), []);
  });
});
