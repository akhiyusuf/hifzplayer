import type { Mark, Verse, Word } from "../types.ts";
import { splitByWaqf } from "../waqf.ts";
import type { ExpectedPhrase, ExpectedWord } from "./types.ts";

export type PhraseRange = {
  id?: string;
  verseKey?: string;
  from: number;
  to: number;
};

export type RawExpectedWord = {
  pos?: number;
  ar?: string;
  text?: string;
  verseKey?: string;
  audio?: string | null;
};

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

/** Quran.com word clip id. `1:1` word 1 → `wbw/001_001_001.mp3`. */
export function wbwClipId(verseKey: string, pos: number): string | null {
  const match = /^(\d+):(\d+)$/.exec(verseKey);
  if (!match) return null;
  const surah = Number(match[1]);
  const ayah = Number(match[2]);
  if (surah < 1 || surah > 114 || ayah < 1 || pos < 1) return null;
  return `wbw/${pad3(surah)}_${pad3(ayah)}_${pad3(pos)}.mp3`;
}

export function verseKeyFrom(surah?: number, ayah?: number): string | null {
  if (!surah || !ayah) return null;
  if (surah < 1 || surah > 114 || ayah < 1) return null;
  return `${surah}:${ayah}`;
}

function wordTarget(verseKey: string, pos: number, audio?: string | null) {
  const clip = (audio || "").trim();
  if (clip) return clip;
  return wbwClipId(verseKey, pos) || `${verseKey}:${pos}`;
}

function asWord(raw: RawExpectedWord, index: number, fallbackVerseKey: string): Word & { verseKey: string } {
  const pos = raw.pos && raw.pos > 0 ? Math.floor(raw.pos) : index + 1;
  const verseKey = (raw.verseKey || "").trim() || fallbackVerseKey;
  return {
    pos,
    ar: String(raw.ar || raw.text || "").trim(),
    taj: null,
    gloss: "",
    tr: "",
    audio: raw.audio || null,
    verseKey,
  };
}

function phraseFor(words: ExpectedWord[], id: string, verseKey: string): ExpectedPhrase | null {
  if (!words.length) return null;
  return {
    id,
    verseKey,
    from: words[0].pos,
    to: words[words.length - 1].pos,
    wordIndexes: words.map((word) => word.index),
  };
}

function packGroups(
  groups: { id: string; verseKey: string; words: (Word & { verseKey: string })[] }[],
): { words: ExpectedWord[]; phrases: ExpectedPhrase[] } {
  const words: ExpectedWord[] = [];
  const phrases: ExpectedPhrase[] = [];
  for (const group of groups) {
    const slice: ExpectedWord[] = [];
    for (const word of group.words) {
      const row: ExpectedWord = {
        index: words.length,
        pos: word.pos,
        ar: word.ar,
        verseKey: word.verseKey,
        audio: word.audio || null,
        targetId: wordTarget(word.verseKey, word.pos, word.audio),
        phraseId: group.id,
      };
      words.push(row);
      slice.push(row);
    }
    const phrase = phraseFor(slice, group.id, group.verseKey);
    if (phrase) phrases.push(phrase);
  }
  return { words, phrases };
}

/** Phrase edges follow waqf stops. A pause-less ayah stays one phrase. */
export function expectedFromVerse(verse: Pick<Verse, "key" | "words" | "marks">): {
  words: ExpectedWord[];
  phrases: ExpectedPhrase[];
} {
  const groups = splitByWaqf(verse);
  return packGroups(
    groups.map((group, phraseIndex) => ({
      id: `${verse.key}:p${phraseIndex}`,
      verseKey: verse.key,
      words: group.map((word) => ({ ...word, verseKey: verse.key })),
    })),
  );
}

export function expectedFromVerses(verses: Pick<Verse, "key" | "words" | "marks">[]) {
  const words: ExpectedWord[] = [];
  const phrases: ExpectedPhrase[] = [];
  for (const verse of verses) {
    const part = expectedFromVerse(verse);
    const shift = words.length;
    for (const word of part.words) {
      words.push({ ...word, index: word.index + shift });
    }
    for (const phrase of part.phrases) {
      phrases.push({
        ...phrase,
        wordIndexes: phrase.wordIndexes.map((index) => index + shift),
      });
    }
  }
  return { words, phrases };
}

/**
 * Caller-supplied phrase ranges (waqf already applied, or a mutashabihat
 * `{ g, f, t }` row mapped to `{ id, from, to }`). Reading order stays put.
 * Words outside every range stay in contiguous remainder phrases — they are
 * not sliced into single words.
 */
export function applyPhraseRanges(
  words: ExpectedWord[],
  ranges: PhraseRange[],
): { words: ExpectedWord[]; phrases: ExpectedPhrase[] } {
  const usable = ranges.filter((range) => range.from > 0 && range.to >= range.from);
  if (!usable.length) return groupWholeVerses(words);

  const assigned: (string | null)[] = words.map(() => null);
  usable.forEach((range, rangeIndex) => {
    let id: string | null = null;
    words.forEach((word, index) => {
      if (assigned[index]) return;
      if (range.verseKey && range.verseKey !== word.verseKey) return;
      if (word.pos < range.from || word.pos > range.to) return;
      if (!id) {
        const verseKey = range.verseKey || word.verseKey;
        id = (range.id || "").trim() || `${verseKey}:p${rangeIndex}`;
      }
      assigned[index] = id;
    });
  });

  const groups: { id: string; verseKey: string; words: (Word & { verseKey: string })[] }[] = [];
  const used = new Set<string>();
  let restSerial = 0;
  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    let id = assigned[index];
    if (!id) {
      const prev = groups[groups.length - 1];
      if (prev && prev.verseKey === word.verseKey && prev.id.startsWith(`${word.verseKey}:rest`)) {
        id = prev.id;
      } else {
        restSerial += 1;
        id = `${word.verseKey}:rest${restSerial}`;
      }
    }
    const row: Word & { verseKey: string } = {
      pos: word.pos,
      ar: word.ar,
      taj: null,
      gloss: "",
      tr: "",
      audio: word.audio,
      verseKey: word.verseKey,
    };
    const last = groups[groups.length - 1];
    const continuesRange = index > 0 && assigned[index] != null && assigned[index] === assigned[index - 1];
    const continuesRest =
      !assigned[index] &&
      last &&
      last.verseKey === word.verseKey &&
      last.id.startsWith(`${word.verseKey}:rest`);
    if (last && (continuesRange || continuesRest)) {
      last.words.push(row);
      continue;
    }
    let unique = id;
    if (used.has(unique)) unique = `${id}:${groups.length}`;
    used.add(unique);
    groups.push({ id: unique, verseKey: word.verseKey, words: [row] });
  }
  return packGroups(groups);
}

function groupWholeVerses(words: ExpectedWord[]) {
  const byVerse = new Map<string, ExpectedWord[]>();
  for (const word of words) {
    const bucket = byVerse.get(word.verseKey) || [];
    bucket.push(word);
    byVerse.set(word.verseKey, bucket);
  }
  const groups = [...byVerse.entries()].map(([verseKey, members]) => ({
    id: `${verseKey}:p0`,
    verseKey,
    words: members.map((word) => ({
      pos: word.pos,
      ar: word.ar,
      taj: null,
      gloss: "",
      tr: "",
      audio: word.audio,
      verseKey,
    })),
  }));
  return packGroups(groups);
}

export function expectedFromText(
  text: string,
  verseKey: string,
): { words: ExpectedWord[]; phrases: ExpectedPhrase[] } {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  return groupWholeVerses(
    parts.map((ar, index) => ({
      index,
      pos: index + 1,
      ar,
      verseKey,
      audio: null,
      targetId: wordTarget(verseKey, index + 1, null),
      phraseId: `${verseKey}:p0`,
    })),
  );
}

export function expectedFromRawWords(
  rawWords: RawExpectedWord[],
  options: {
    fallbackVerseKey: string;
    marks?: Mark[];
    phrases?: PhraseRange[];
  },
): { words: ExpectedWord[]; phrases: ExpectedPhrase[] } {
  const drafted = rawWords
    .map((raw, index) => asWord(raw, index, options.fallbackVerseKey))
    .filter((word) => word.ar);

  const verseKeys = [...new Set(drafted.map((word) => word.verseKey))];
  const phrases = options.phrases || [];
  const marks = options.marks || [];

  if (!phrases.length && marks.length && verseKeys.length === 1) {
    return expectedFromVerse({
      key: verseKeys[0],
      words: drafted,
      marks,
    });
  }

  const flat = groupWholeVerses(
    drafted.map((word, index) => ({
      index,
      pos: word.pos,
      ar: word.ar,
      verseKey: word.verseKey,
      audio: word.audio || null,
      targetId: wordTarget(word.verseKey, word.pos, word.audio),
      phraseId: `${word.verseKey}:p0`,
    })),
  );
  if (!phrases.length) return flat;
  return applyPhraseRanges(flat.words, phrases);
}

/** Mutashabihat row `{ g, f, t }` → a phrase range on this ayah. */
export function rangesFromAnnotation(
  verseKey: string,
  rows: { g?: string; f?: number; t?: number }[],
): PhraseRange[] {
  const out: PhraseRange[] = [];
  for (const row of rows) {
    const from = Number(row.f);
    const to = Number(row.t);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) continue;
    const group = String(row.g || "").trim();
    out.push({
      id: group ? `${verseKey}:${group}` : undefined,
      verseKey,
      from,
      to,
    });
  }
  return out;
}
