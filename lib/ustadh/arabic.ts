/**
 * Fold Quranic spelling down to a comparable Arabic skeleton.
 * Diacritics, waqf marks, and alef/hamza variants are ignored so a correct
 * recitation is not flagged for tashkeel the recognizer dropped.
 * Alif maqsura (ى) stays distinct from ya (ي): على and علي are different words.
 */
const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/g;

export function normalizeArabic(input: string): string {
  return String(input ?? "")
    .normalize("NFC")
    .replace(DIACRITICS, "")
    .replace(/\u0640/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ء/g, "")
    .replace(/ة/g, "ه")
    .replace(/[^\u0621-\u064A\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function arabicEqual(a: string, b: string): boolean {
  const left = normalizeArabic(a);
  const right = normalizeArabic(b);
  return left.length > 0 && left === right;
}

export function tokenizeArabic(text: string): string[] {
  return String(text ?? "")
    .trim()
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Groq's Whisper prompt is capped at 224 tokens. Stay well under that in characters. */
export const QURAN_PROMPT_CHARS = 180;

export function quranAsrPrompt(text: string): string | undefined {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!flat) return undefined;
  if (flat.length <= QURAN_PROMPT_CHARS) return flat;
  const cut = flat.slice(0, QURAN_PROMPT_CHARS);
  const space = cut.lastIndexOf(" ");
  return (space > 40 ? cut.slice(0, space) : cut).trim();
}
