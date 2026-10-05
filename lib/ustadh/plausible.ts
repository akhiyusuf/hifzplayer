import type { AsrWord } from "./types.ts";

/**
 * Whisper fills gaps from the prompt (the expected ayah): words the learner never
 * said come back with tell-tale timestamps. Observed on real Groq output for
 * reference recitation with a word cut out (scripts/ustadh-audio-soak.ts):
 *   إِيَّاكَ[0.40-1.28] نَعْبُدُ[1.28-2.10] وَإِيَّاكَ[2.10-2.20] نَعْبُدُ[2.20-2.22] وَإِيَّاكَ[2.22-2.32] …
 * A recited Quran word never lasts 20 ms, and a run of 100 ms words is a squeeze,
 * not speech. Words that start or end well past the uploaded clip did not happen.
 */
export const USTADH_PLAUSIBLE = {
  /** Shorter than this is never a recited word. */
  minWordSec: 0.06,
  /** Two or more consecutive words shorter than this are a squeezed run. */
  squeezeSec: 0.15,
  /** Drop words starting this long after the clip ends. */
  startSlackSec: 0.25,
  /** Drop words ending this long after the clip ends. */
  endSlackSec: 0.6,
} as const;

function duration(word: AsrWord): number | null {
  if (!Number.isFinite(word.start) || !Number.isFinite(word.end)) return null;
  return word.end - word.start;
}

/** Keep only heard words whose timing could be real speech. Order is preserved. */
export function plausibleAsrWords(
  words: AsrWord[],
  options: { clipSec?: number | null; chunkStart?: number } = {},
  config: { readonly [K in keyof typeof USTADH_PLAUSIBLE]: number } = USTADH_PLAUSIBLE,
): AsrWord[] {
  const list = words || [];
  if (!list.length) return [];
  const offset = options.chunkStart && options.chunkStart > 0 ? options.chunkStart : 0;
  const clip = options.clipSec != null && Number.isFinite(options.clipSec) && options.clipSec > 0 ? options.clipSec : null;

  const drop = new Array<boolean>(list.length).fill(false);
  // Squeezed runs (≥2 consecutive very short words).
  let runStart = -1;
  const closeRun = (end: number) => {
    if (runStart >= 0 && end - runStart >= 2) for (let k = runStart; k < end; k++) drop[k] = true;
    runStart = -1;
  };
  list.forEach((word, index) => {
    const d = duration(word);
    if (d != null && d < config.squeezeSec) {
      if (runStart < 0) runStart = index;
    } else {
      closeRun(index);
    }
  });
  closeRun(list.length);

  return list.filter((word, index) => {
    if (drop[index]) return false;
    const d = duration(word);
    if (d != null && d < config.minWordSec) return false;
    if (clip != null) {
      const start = word.start - offset;
      const end = word.end - offset;
      if (Number.isFinite(start) && start > clip + config.startSlackSec) return false;
      if (Number.isFinite(end) && end > clip + config.endSlackSec) return false;
    }
    return true;
  });
}
