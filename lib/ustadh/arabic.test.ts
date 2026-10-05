import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { arabicEqual, normalizeArabic, quranAsrPrompt, QURAN_PROMPT_CHARS } from "./arabic.ts";

describe("normalizeArabic", () => {
  it("strips tashkeel and folds alef and ta marbuta", () => {
    assert.equal(normalizeArabic("بِسْمِ"), "بسم");
    assert.equal(normalizeArabic("ٱللَّهِ"), "الله");
    assert.equal(normalizeArabic("رَحْمَة"), "رحمه");
    assert.equal(arabicEqual("بِسْمِ", "بسم"), true);
    assert.equal(arabicEqual("رَحْمَة", "رحمه"), true);
  });

  it("keeps alif maqsura distinct from ya", () => {
    assert.notEqual(normalizeArabic("عَلَى"), normalizeArabic("عَلِي"));
    assert.equal(arabicEqual("عَلَى", "علي"), false);
  });
});

describe("quranAsrPrompt", () => {
  it("returns undefined for empty text and caps long text", () => {
    assert.equal(quranAsrPrompt("   "), undefined);
    assert.equal(quranAsrPrompt("بسم الله"), "بسم الله");
    const long = Array.from({ length: 80 }, () => "الرحمن").join(" ");
    const prompt = quranAsrPrompt(long);
    assert.ok(prompt);
    assert.ok(prompt.length <= QURAN_PROMPT_CHARS);
    assert.equal(prompt.endsWith(" "), false);
  });
});
