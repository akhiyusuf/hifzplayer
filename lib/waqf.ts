import type { Mark, Verse, Word } from "./types.ts";

/** Compulsory or recommended stop, and the usual pause letters (م قلى ج ۛ). */
const BREAK = /[ۘۗۚۛۜ]/;
/** Preferred continue (صلى) and “do not stop” (لا) — keep the phrase going. */
const HOLD = /[ۖۙ]/;
const PAUSE_RANGE = /[ۖ-ۜ]/;

export type WaqfKind = "break" | "hold" | "other";

export function waqfKind(ar: string | null | undefined): WaqfKind {
  const text = String(ar ?? "");
  if (BREAK.test(text)) return "break";
  if (HOLD.test(text)) return "hold";
  if (PAUSE_RANGE.test(text)) return "break";
  return "other";
}

export function isWaqfBreak(ar: string | null | undefined) {
  return waqfKind(ar) === "break";
}

function isVerseEndMark(mark: Mark) {
  return mark.kind === "end" || /^[\d٠-٩۰-۹]/.test(mark.ar);
}

export function visibleMarksAfter(verse: Pick<Verse, "marks">, pos: number) {
  return (verse.marks || []).filter((mark) => mark.afterPos === pos && !isVerseEndMark(mark));
}

function wordBreaks(word: Word, marks: Mark[]) {
  if (isWaqfBreak(word.ar)) return true;
  return marks.some((mark) => isWaqfBreak(mark.ar));
}

/** Split an ayah on stop/pause marks, like punctuation — never on a 6-word cap. */
export function splitByWaqf(verse: Pick<Verse, "words" | "marks">): Word[][] {
  const words = verse.words || [];
  if (!words.length) return [];
  const out: Word[][] = [];
  let buf: Word[] = [];
  for (const word of words) {
    buf.push(word);
    const marks = visibleMarksAfter(verse, word.pos);
    if (wordBreaks(word, marks) && buf.length) {
      out.push(buf);
      buf = [];
    }
  }
  if (buf.length) out.push(buf);
  return out.length ? out : [words];
}

export function phrasesOf(verse: Verse): Word[][] {
  if (verse._phrases) return verse._phrases;
  verse._phrases = splitByWaqf(verse);
  return verse._phrases;
}
