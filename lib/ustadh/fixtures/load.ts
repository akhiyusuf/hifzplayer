import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Verse } from "../../types.ts";
import { expectedFromVerse } from "../units.ts";

const here = dirname(fileURLToPath(import.meta.url));

/** Real Quran.com verse rows (text_uthmani + wbw audio ids) for tests and the soak harness. */
export function fixtureVerses(): Verse[] {
  const raw = JSON.parse(readFileSync(join(here, "verses.json"), "utf8")) as {
    key: string;
    number: number;
    words: { pos: number; ar: string; audio: string | null }[];
    marks: { afterPos: number; ar: string; kind: string }[];
  }[];
  return raw.map((row) => ({
    key: row.key,
    number: row.number,
    words: row.words.map((word) => ({ pos: word.pos, ar: word.ar, taj: null, gloss: "", tr: "", audio: word.audio })),
    marks: row.marks,
    translation: "",
    audio: null,
  })) as unknown as Verse[];
}

export function fixtureVerse(key: string): Verse {
  const verse = fixtureVerses().find((row) => row.key === key);
  if (!verse) throw new Error(`fixture verse ${key} missing`);
  return verse;
}

export function fixturePassage(key: string) {
  return expectedFromVerse(fixtureVerse(key));
}

export function fixtureDir(): string {
  return here;
}
