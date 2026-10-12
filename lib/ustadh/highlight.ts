import { filterArabicAsrWords } from "./arabic.ts";
import { alignPrefix, alignWords, type AlignOp } from "./interrupt.ts";
import { plausibleAsrWords, USTADH_PLAUSIBLE } from "./plausible.ts";
import type { AsrWord, ExpectedWord } from "./types.ts";

/**
 * Live highlight tuning.
 * - `intervalMs`: rolling ASR peek cadence while the learner is still speaking.
 * - `maxWordsPerSec` + `reachSlack`: a peek may not move the highlight further than
 *   the learner could have recited in the voiced time so far. Whisper sometimes
 *   "completes" the ayah from the prompt on a short clip; this stops that jump.
 * - `stepMs`: the visible highlight walks one word per step toward the target so a
 *   peek that confirms 3 words reads as 3 quick steps, not a jump.
 * Heard words with impossible timing (see plausible.ts) are dropped before aligning.
 */
export const USTADH_PEEK = {
  intervalMs: 1_500,
  /**
   * Live peeks flag the frontier as off-track only when ≥2 unmatched tokens cover at
   * least this much audio. A partial clip can garble one word into several tokens
   * (إياك → "إن يا كن" seen in the browser e2e); that must not flash an underline.
   */
  offTrackSec: 2.5,
  maxWordsPerSec: 2.5,
  reachSlack: 1,
  stepMs: 140,
} as const;

/** Rolling ASR peek interval while the learner is still speaking. */
export const USTADH_ROLLING_PEEK_MS = USTADH_PEEK.intervalMs;

export type UstadhReciteHighlight = {
  /** 1-based Mushaf word pos to mark as current (frontier or last word when complete). */
  curPos: number;
  /** Last confirmed word pos (inclusive) — the recited-so-far underline ends here. */
  matchedEndPos: number | null;
  /** First missed word pos, if any. */
  missPos: number | null;
  /** Every missed word pos up to the frontier (wrong word or skipped word). */
  missPositions: number[];
  /** Contiguous match count from the ayah start. */
  matchedCount: number;
  /** Expected words consumed through the last confirmed match. */
  reach: number;
  /** True once the last expected word is confirmed. */
  complete: boolean;
};

export function emptyReciteHighlight(words: ExpectedWord[]): UstadhReciteHighlight {
  return {
    curPos: words[0]?.pos ?? 1,
    matchedEndPos: null,
    missPos: null,
    missPositions: [],
    matchedCount: 0,
    reach: 0,
    complete: false,
  };
}

/** Max expected words a peek may confirm after `voicedMs` of speech. */
export function maxReachForVoiced(voicedMs: number, config = USTADH_PEEK): number {
  const seconds = Math.max(0, Number(voicedMs) || 0) / 1000;
  return Math.floor(seconds * config.maxWordsPerSec) + config.reachSlack;
}

function usableHeard(heard: AsrWord[], clipSec: number | undefined, live: boolean): AsrWord[] {
  const words = plausibleAsrWords(filterArabicAsrWords(heard || []), { clipSec });
  if (!live || !words.length) return words;
  // Live peek: a very short last word is a cut-off or prompt-filled tail — wait a peek.
  const last = words[words.length - 1]!;
  const d = last.end - last.start;
  if (Number.isFinite(d) && d < USTADH_PLAUSIBLE.squeezeSec) return words.slice(0, -1);
  return words;
}

function contiguousMatches(ops: AlignOp[]): number {
  let count = 0;
  for (const op of ops) {
    if (op.kind === "ins") continue;
    if (op.kind === "match" && op.expectedIndex === count) {
      count += 1;
      continue;
    }
    if (op.kind === "match" && op.expectedIndex < count) continue; // merged pair
    break;
  }
  return count;
}

/**
 * Tarteel-style progress for one take.
 *
 * Live peeks (`final` false) use a prefix alignment: only words the learner has
 * reached count, the highlight advances to the last *confirmed* match, and words
 * skipped or said wrong before that point are listed as misses (underlined, never
 * silently passed). A single unmatched trailing token is treated as a word still
 * being spoken (often cut mid-word by the peek) and is not flagged yet; two or more
 * covering at least `offTrackSec` of audio mean the learner is off track and the
 * frontier word is flagged.
 *
 * `final` (the take was sent) flags the frontier word when the take stopped short
 * or ended on a wrong word.
 */
export function reciteHighlightFromHeard(input: {
  words: ExpectedWord[];
  heard: AsrWord[];
  final?: boolean;
  /** Cap on confirmed words (see {@link maxReachForVoiced}). Ignored when final. */
  maxReach?: number | null;
  /** Uploaded clip length in seconds; words with timing past it are dropped. */
  clipSec?: number;
}): UstadhReciteHighlight {
  const words = input.words;
  if (!words.length) {
    return { ...emptyReciteHighlight(words), curPos: 1 };
  }
  const final = !!input.final;
  const heard = usableHeard(input.heard, input.clipSec, !final);
  const expectedAr = words.map((word) => word.ar);
  const heardAr = heard.map((word) => word.word);

  const ops = final ? alignWords(expectedAr, heardAr) : alignPrefix(expectedAr, heardAr).ops;

  let lastMatch = -1;
  let lastMatchOp = -1;
  ops.forEach((op, index) => {
    if (op.kind === "match" && op.expectedIndex > lastMatch) {
      lastMatch = op.expectedIndex;
      lastMatchOp = index;
    }
  });
  let reach = lastMatch + 1;

  const missSet = new Set<number>();
  for (const op of ops) {
    if ((op.kind === "sub" || op.kind === "del") && op.expectedIndex < reach) {
      missSet.add(op.expectedIndex);
    }
  }

  // Unmatched heard tokens after the last confirmed word (split halves don't count).
  let tail = 0;
  let tailStart: number | null = null;
  let tailEnd: number | null = null;
  for (let index = lastMatchOp + 1; index < ops.length; index++) {
    const op = ops[index]!;
    if ((op.kind === "ins" && !op.joined) || op.kind === "sub") {
      tail += 1;
      const word = heard[op.heardIndex];
      if (word && Number.isFinite(word.start)) tailStart = tailStart == null ? word.start : Math.min(tailStart, word.start);
      if (word && Number.isFinite(word.end)) tailEnd = tailEnd == null ? word.end : Math.max(tailEnd, word.end);
    }
  }
  const clipEnd = input.clipSec != null && Number.isFinite(input.clipSec) ? input.clipSec : tailEnd;
  const tailSpan = tailStart != null && clipEnd != null ? clipEnd - tailStart : null;

  if (!final && input.maxReach != null && Number.isFinite(input.maxReach)) {
    const cap = Math.max(0, Math.floor(input.maxReach));
    if (reach > cap) {
      reach = cap;
      for (const index of [...missSet]) if (index >= reach) missSet.delete(index);
      tail = 0;
    }
  }

  if (reach < words.length) {
    const offTrack = tailSpan != null ? tail >= 2 && tailSpan >= USTADH_PEEK.offTrackSec : tail >= 3;
    const stoppedShort = final && (tail > 0 || heard.length > 0 || reach > 0);
    if (offTrack || stoppedShort) missSet.add(reach);
  }

  const complete = reach >= words.length;
  const missIndexes = [...missSet].sort((a, b) => a - b);
  const missPositions = missIndexes.map((index) => words[index]!.pos);
  const frontier = complete ? words.length - 1 : reach;
  const matchedCount = Math.min(contiguousMatches(ops), reach);

  return {
    curPos: words[frontier]!.pos,
    matchedEndPos: reach > 0 ? words[reach - 1]!.pos : null,
    missPos: missPositions[0] ?? null,
    missPositions,
    matchedCount,
    reach,
    complete,
  };
}

/**
 * Peeks only move forward within a take: a later peek that re-transcribes worse
 * (common when the clip grows) never pulls the highlight back. Final results
 * replace the peek state outright.
 */
export function mergePeekHighlight(
  prev: UstadhReciteHighlight | null,
  next: UstadhReciteHighlight,
): UstadhReciteHighlight {
  if (!prev) return next;
  if (next.reach > prev.reach) return next;
  if (next.reach === prev.reach) {
    // Same reach: newer transcript wins on which words are misses.
    return next;
  }
  return prev;
}

/** Next visible step toward `targetReach` (one word at a time forward; jump back). */
export function nextShownStep(shown: number, targetReach: number): number {
  if (targetReach <= shown) return targetReach;
  return shown + 1;
}

/** What to paint when the visible highlight has walked `shown` words of `target`. */
export function highlightAtStep(
  target: UstadhReciteHighlight,
  words: ExpectedWord[],
  shown: number,
): UstadhReciteHighlight {
  if (!words.length) return target;
  const step = Math.max(0, Math.min(Math.floor(shown), target.reach));
  if (step >= target.reach) return target;
  const frontierPos = words[step]!.pos;
  const missPositions = target.missPositions.filter((pos) => pos < frontierPos);
  return {
    curPos: frontierPos,
    matchedEndPos: step > 0 ? words[step - 1]!.pos : null,
    missPos: missPositions[0] ?? null,
    missPositions,
    matchedCount: Math.min(target.matchedCount, step),
    reach: step,
    complete: false,
  };
}

/** Highlight while Ustadh plays word `index` of a replay: the clip's word is current. */
export function replaySpeakingHighlight(
  words: ExpectedWord[],
  index: number,
  missPositions: number[] = [],
): UstadhReciteHighlight {
  const word = words[index] ?? words[0];
  return {
    curPos: word?.pos ?? 1,
    matchedEndPos: null,
    missPos: missPositions[0] ?? null,
    missPositions: [...missPositions],
    matchedCount: 0,
    reach: 0,
    complete: false,
  };
}

function cleanInt(value: unknown): number | null {
  if (typeof value !== "number") return null;
  const n = value;
  return Number.isInteger(n) && n >= 0 && n < 100_000 ? n : null;
}

/**
 * Scoped CSS for coach-only word states, keyed by the `data-v` / `data-w`
 * attributes every Mushaf and Focus word already renders. Keeps the coach
 * removable: no changes to the shared word components.
 */
export function ustadhWordCss(input: {
  vIdx: number | null | undefined;
  missPositions?: number[];
  speakingPos?: number | null;
}): string {
  const vIdx = cleanInt(input.vIdx);
  if (vIdx == null) return "";
  const sel = (pos: number) => `.shell.player .w[data-v="${vIdx}"][data-w="${pos}"]`;
  const rules: string[] = [];
  const misses = (input.missPositions || []).map(cleanInt).filter((pos): pos is number => pos != null && pos > 0);
  if (misses.length) {
    rules.push(
      `${misses.map(sel).join(",")}{color:var(--state-error)!important;` +
        `background:color-mix(in srgb,var(--state-error) 12%,transparent)!important;` +
        `text-decoration:underline wavy var(--state-error);text-decoration-thickness:2px;` +
        `text-underline-offset:.45em;text-decoration-skip-ink:none;border-radius:6px}`,
    );
  }
  const speaking = cleanInt(input.speakingPos);
  if (speaking != null && speaking > 0) {
    rules.push(
      `${sel(speaking)}{background:color-mix(in srgb,var(--state-success) 18%,transparent)!important;` +
        `box-shadow:inset 0 0 0 1.5px var(--state-success)!important;border-radius:6px}`,
    );
  }
  return rules.join("\n");
}

export type HighlightEngine = {
  getSnapshot: () => { vIdx: number; wordPick?: unknown; curWord?: number };
  notify?: () => void;
  notifyWord?: () => void;
  /**
   * PlayerEngine.onWordChange takes the VERSE OBJECT (it runs phrasesOf(verse) for
   * the Focus page). Passing the numeric index crashed Focus style.
   */
  onWordChange?(verse: { key: string }, pos: number): void;
  st?: {
    curWord: number;
    wordPick: {
      start: number | null;
      end: number | null;
      count: number | null;
      open: number | null;
      vIdx: number | null;
    };
    vIdx: number;
  };
};

type WordPick = NonNullable<HighlightEngine["st"]>["wordPick"];

/** Pin / underline the coach should show for this highlight. */
export function pickForHighlight(
  vIdx: number,
  highlight: UstadhReciteHighlight,
  firstPos = 1,
): WordPick {
  if (highlight.matchedEndPos != null && highlight.matchedEndPos >= firstPos) {
    return { start: firstPos, end: highlight.matchedEndPos, count: null, open: null, vIdx };
  }
  if (highlight.missPos != null) {
    // Pending underline on the miss frontier when nothing matched yet.
    return { start: highlight.missPos, end: null, count: null, open: null, vIdx };
  }
  return { start: null, end: null, count: null, open: null, vIdx: null };
}

function samePick(a: WordPick | undefined, b: WordPick): boolean {
  return !!a && a.start === b.start && a.end === b.end && a.vIdx === b.vIdx && a.open === b.open;
}

/**
 * Drive Mushaf/Focus `cur` + pin underline from recite progress.
 * `verse` is the open verse object (needed by the engine's Focus page sync); without
 * it the engine is only notified.
 */
export function applyUstadhReciteHighlight(
  engine: HighlightEngine,
  vIdx: number,
  highlight: UstadhReciteHighlight,
  firstPos = 1,
  verse: { key: string } | null = null,
): void {
  const st = engine.st;
  if (!st) return;
  const pick = pickForHighlight(vIdx, highlight, firstPos);
  const pickChanged = !samePick(st.wordPick, pick);
  const wordChanged = st.curWord !== highlight.curPos;
  if (!pickChanged && !wordChanged) return;
  st.curWord = highlight.curPos;
  st.wordPick = pick;
  if (verse && typeof engine.onWordChange === "function") {
    engine.onWordChange(verse, highlight.curPos);
    // Mushaf style only refreshes the word store on onWordChange; the pin
    // underline lives in the full snapshot.
    if (pickChanged) engine.notify?.();
  } else if (pickChanged) {
    engine.notify?.();
  } else if (typeof engine.notifyWord === "function") {
    engine.notifyWord();
  } else {
    engine.notify?.();
  }
}

export function clearUstadhReciteHighlight(engine: HighlightEngine): void {
  const st = engine.st;
  if (!st) return;
  st.wordPick = {
    start: null,
    end: null,
    count: null,
    open: null,
    vIdx: null,
  };
  // Leave curWord as-is unless zeroed by caller.
  engine.notify?.();
}

/** Live-peek highlight with the voiced-time cap and clip-length filter applied. */
export function peekHighlightFrom(input: {
  words: ExpectedWord[];
  heard: AsrWord[];
  voicedMs: number;
  clipSec?: number;
  config?: typeof USTADH_PEEK;
}): UstadhReciteHighlight {
  const config = input.config ?? USTADH_PEEK;
  return reciteHighlightFromHeard({
    words: input.words,
    heard: input.heard,
    maxReach: maxReachForVoiced(input.voicedMs, config),
    clipSec: input.clipSec,
  });
}
