import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ARABIC_ASR_RETRY_LIMIT,
  arabicEqual,
  filterArabicAsrWords,
  filterArabicTranscript,
  hasArabicScript,
  normalizeArabic,
  normalizeArabicVariants,
  quranAsrPrompt,
  QURAN_PROMPT_CHARS,
  strongQuranAsrPrompt,
  transcriptNeedsArabicRetry,
} from "./arabic.ts";

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

  it("matches dagger-alef words to ASR plain alef without breaking الرحمن", () => {
    assert.equal(arabicEqual("ٱلْعَٰلَمِينَ", "العالمين"), true);
    assert.equal(arabicEqual("ٱلصِّرَٰطَ", "الصراط"), true);
    assert.equal(arabicEqual("مَٰلِكِ", "مالك"), true);
    assert.equal(arabicEqual("ٱلرَّحْمَٰنِ", "الرحمن"), true);
    assert.equal(arabicEqual("ٱلرَّحْمَٰنِ", "الرحمان"), true);
    assert.ok(normalizeArabicVariants("ٱلْعَٰلَمِينَ").includes("العالمين"));
    assert.ok(normalizeArabicVariants("ٱلرَّحْمَٰنِ").includes("الرحمن"));
    assert.equal(normalizeArabic("ٱلْعَٰلَمِينَ"), "العالمين");
  });
});

describe("filterArabicTranscript", () => {
  it("drops Latin ASR noise and keeps Arabic tokens", () => {
    assert.equal(filterArabicTranscript("الحمد لله alhamdulillah رب"), "الحمد لله رب");
    assert.equal(filterArabicTranscript("hello world"), "");
    assert.equal(hasArabicScript("العالمين"), true);
    assert.equal(hasArabicScript("alameen"), false);
    assert.deepEqual(
      filterArabicAsrWords([
        { word: "الحمد", start: 0, end: 0.3 },
        { word: "praise", start: 0.3, end: 0.5 },
        { word: "لله", start: 0.5, end: 0.8 },
      ]).map((row) => row.word),
      ["الحمد", "لله"],
    );
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

describe("Latin ASR retry helpers", () => {
  it("detects Latin-only transcripts and builds stronger prompts per attempt", () => {
    assert.equal(transcriptNeedsArabicRetry("alhamdulillah rabbil alameen", []), true);
    assert.equal(
      transcriptNeedsArabicRetry("hello", [{ word: "world", start: 0, end: 1 }]),
      true,
    );
    assert.equal(transcriptNeedsArabicRetry("الحمد لله", []), false);
    assert.equal(transcriptNeedsArabicRetry("", []), false);
    assert.equal(ARABIC_ASR_RETRY_LIMIT, 3);
    const p1 = strongQuranAsrPrompt("ٱلْحَمْدُ لِلَّهِ", 1);
    const p2 = strongQuranAsrPrompt("ٱلْحَمْدُ لِلَّهِ", 2);
    const p3 = strongQuranAsrPrompt("ٱلْحَمْدُ لِلَّهِ", 3);
    assert.ok(p1 && p1.includes("ٱلْحَمْدُ"));
    assert.ok(p2 && p2 !== p1);
    assert.ok(p3 && p3 !== p2);
    assert.ok(p1.length <= QURAN_PROMPT_CHARS);
  });
});

describe("arabicEqual matrix (Mushaf text vs plain ASR)", () => {
  const same: [string, string, string][] = [
    ["tatweel + dagger alef", "ٱلْعَـٰلَمِينَ", "العالمين"],
    ["dagger alef, stripped form", "ٱلرَّحْمَـٰنِ", "الرحمن"],
    ["dagger alef, expanded form", "ٱلرَّحْمَـٰنِ", "الرحمان"],
    ["dagger alef mid-word", "مَـٰلِكِ", "مالك"],
    ["dagger alef with alef wasla", "ٱلصِّرَٰطَ", "الصراط"],
    ["alef wasla", "ٱهْدِنَا", "اهدنا"],
    ["hamza on alef", "أَنْعَمْتَ", "انعمت"],
    ["hamza below alef", "إِيَّاكَ", "اياك"],
    ["madda", "ءَامَنُوا۟", "آمنوا"],
    ["small high rounded zero", "ءَامَنُوا۟", "امنوا"],
    ["ta marbuta vs ha", "ٱلصَّلَوٰةَ", "الصلاه"],
    ["small low meem (iqlab mark)", "هُدًۭى", "هدى"],
    ["shadda + kasra", "لِّلْمُتَّقِينَ", "للمتقين"],
    ["waw hamza", "يُؤْمِنُونَ", "يومنون"],
    ["ya hamza", "ٱلْأَفْـِٔدَةِ", "الافيده"],
    ["inverted damma (ۥ)", "لَّهُۥ", "له"],
    ["sukun on nun", "يَكُن", "يكن"],
    ["identical plain", "رب", "رب"],
  ];
  for (const [label, mushaf, asr] of same) {
    it(`matches: ${label}`, () => {
      assert.equal(arabicEqual(mushaf, asr), true, `${mushaf} vs ${asr}`);
      assert.equal(arabicEqual(asr, mushaf), true, `symmetric ${asr} vs ${mushaf}`);
    });
  }

  const different: [string, string, string][] = [
    ["case ending i vs u (العالمين / العالمون)", "ٱلْعَـٰلَمِينَ", "العالمون"],
    ["alif maqsura vs ya", "عَلَى", "علي"],
    ["different root", "رَبِّ", "قال"],
    ["missing letter", "ٱلْمُسْتَقِيمَ", "المستقم"],
    ["extra letter", "نَعْبُدُ", "نعبدو"],
    ["Latin transliteration", "رَبِّ", "rabbi"],
    ["empty vs word", "رَبِّ", ""],
    ["empty vs empty", "", ""],
  ];
  for (const [label, a, b] of different) {
    it(`does not match: ${label}`, () => {
      assert.equal(arabicEqual(a, b), false, `${a} vs ${b}`);
    });
  }
});
