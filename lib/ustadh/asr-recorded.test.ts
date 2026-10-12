import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fixtureDir, fixtureVerse } from "./fixtures/load.ts";
import { checkTakeInvariants, type PeekSample, type SoakTake } from "./soak.ts";
import { coachPayloadForVerse } from "./coach.ts";
import type { AsrWord } from "./types.ts";

/**
 * Offline replay of REAL Groq transcripts of reference recitation (Mishary
 * Alafasy ayah audio + Quran.com word clips, some with a word cut out or the
 * take stopped early). Recorded by:
 *   node --experimental-strip-types scripts/ustadh-audio-soak.ts --record
 * Re-running the highlight pipeline over them catches regressions in alignment,
 * the hallucination guard, and the live walk without calling Groq.
 */
type Recorded = {
  label: string;
  verseKey: string;
  finalClipSec?: number;
  spokenStartMs: (number | null)[];
  expect: SoakTake["expect"];
  peeks: PeekSample[];
  final: AsrWord[];
};

const path = join(fixtureDir(), "asr-recorded.json");
const recorded: Recorded[] = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")).takes : [];

describe("recorded Groq takes → live highlight", { skip: recorded.length ? false : "no asr-recorded.json" }, () => {
  for (const row of recorded) {
    it(row.label, () => {
      const take: SoakTake = {
        label: row.label,
        words: coachPayloadForVerse(fixtureVerse(row.verseKey)).words,
        spokenStartMs: row.spokenStartMs,
        peeks: row.peeks,
        final: row.final,
        finalClipSec: row.finalClipSec,
        expect: row.expect,
      };
      assert.deepEqual(checkTakeInvariants(take), []);
    });
  }
});
