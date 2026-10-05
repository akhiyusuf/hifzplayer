/**
 * Soak harness for the live recite highlight.
 *
 * A "take" is a timeline of rolling ASR peeks (what Groq heard of the clip so
 * far) plus the final transcript. {@link runTakePipeline} feeds it through the
 * exact code the coach bar uses (peekHighlightFrom → UstadhHighlightDriver →
 * final reciteHighlightFromHeard) on a fake clock, and
 * {@link checkTakeInvariants} asserts what Yusuf would otherwise catch by ear:
 * no visual jumps, no running ahead of the learner, no silently skipped words.
 *
 * Takes come from {@link simulateTake} (seeded synthetic ASR noise) or from
 * real Groq transcripts of reference audio (scripts/ustadh-audio-soak.ts).
 */
import { arabicEqual } from "./arabic.ts";
import { type HighlightScheduler, UstadhHighlightDriver } from "./highlight-driver.ts";
import {
  peekHighlightFrom,
  reciteHighlightFromHeard,
  USTADH_PEEK,
  type UstadhReciteHighlight,
} from "./highlight.ts";
import type { AsrWord, ExpectedWord } from "./types.ts";

export type PeekSample = {
  /** Ms since the mic opened. */
  atMs: number;
  /** Ms since the first voiced frame (VAD). */
  voicedMs: number;
  /** Uploaded clip length in seconds. */
  clipSec: number;
  heard: AsrWord[];
};

export type SoakTake = {
  label: string;
  words: ExpectedWord[];
  /** Ms (since mic open) at which the learner starts each expected word; null = never said. */
  spokenStartMs: (number | null)[];
  peeks: PeekSample[];
  final: AsrWord[];
  /**
   * Expected verdict for the final highlight. `missIndexes` must all be underlined.
   * `firstMissMax` (real audio cut mid-connection) instead requires some underline at
   * or before that index without pinning the exact word.
   */
  expect: { complete?: boolean; missIndexes: number[]; firstMissMax?: number };
  /** Uploaded final clip length in seconds (lets the timing guard see past-the-end words). */
  finalClipSec?: number;
};

export type SoakFrame = {
  atMs: number;
  kind: "peek" | "step" | "final";
  painted: UstadhReciteHighlight;
  target: UstadhReciteHighlight | null;
  /** Cap applied at the most recent peek (words). */
  cap: number | null;
};

class ManualScheduler implements HighlightScheduler {
  fns = new Map<number, () => void>();
  next = 1;
  setInterval(fn: () => void) {
    const id = this.next++;
    this.fns.set(id, fn);
    return id;
  }
  clearInterval(id: unknown) {
    this.fns.delete(id as number);
  }
  fire() {
    for (const fn of [...this.fns.values()]) fn();
  }
  get active() {
    return this.fns.size > 0;
  }
}

export function runTakePipeline(input: {
  words: ExpectedWord[];
  peeks: PeekSample[];
  final: AsrWord[] | null;
  finalClipSec?: number;
  stepMs?: number;
}): { frames: SoakFrame[]; final: UstadhReciteHighlight | null } {
  const stepMs = input.stepMs ?? USTADH_PEEK.stepMs;
  const scheduler = new ManualScheduler();
  const frames: SoakFrame[] = [];
  let now = 0;
  let kind: SoakFrame["kind"] = "peek";
  let cap: number | null = null;
  const driver = new UstadhHighlightDriver({
    words: () => input.words,
    paint: (painted) => frames.push({ atMs: now, kind, painted, target: driver.target, cap }),
    scheduler,
    stepMs,
  });
  driver.reset();
  const peeks = [...input.peeks].sort((a, b) => a.atMs - b.atMs);
  for (let index = 0; index < peeks.length; index++) {
    const peek = peeks[index]!;
    now = peek.atMs;
    kind = "peek";
    const next = peekHighlightFrom({
      words: input.words,
      heard: peek.heard,
      voicedMs: peek.voicedMs,
      clipSec: peek.clipSec,
    });
    cap = Math.floor((Math.max(0, peek.voicedMs) / 1000) * USTADH_PEEK.maxWordsPerSec) + USTADH_PEEK.reachSlack;
    driver.peek(next);
    const until = peeks[index + 1]?.atMs ?? peek.atMs + 2_000;
    kind = "step";
    while (scheduler.active && now + stepMs <= until) {
      now += stepMs;
      scheduler.fire();
    }
  }
  if (!input.final) return { frames, final: null };
  kind = "final";
  now += 50;
  const final = reciteHighlightFromHeard({
    words: input.words,
    heard: input.final,
    final: true,
    clipSec: input.finalClipSec,
  });
  driver.final(final);
  kind = "step";
  let guard = 0;
  while (scheduler.active && guard++ < 1_000) {
    now += stepMs;
    scheduler.fire();
  }
  return { frames, final };
}

/** Words the learner had started by `atMs` (in order; stops at the first never-said word only if nothing later was said). */
function startedBy(spokenStartMs: (number | null)[], atMs: number): number {
  let count = 0;
  spokenStartMs.forEach((start, index) => {
    if (start != null && start <= atMs) count = index + 1;
  });
  return count;
}

export function checkTakeInvariants(take: SoakTake, run = runTakePipeline(take)): string[] {
  const failures: string[] = [];
  const { frames, final } = run;
  let lastReach = 0;
  let sawFinal = false;
  for (const frame of frames) {
    const reach = frame.painted.reach;
    if (frame.kind === "final") sawFinal = true;
    if (!sawFinal) {
      if (reach < lastReach) {
        failures.push(`${take.label}: highlight moved back ${lastReach}→${reach} at ${frame.atMs}ms`);
      }
      if (reach > lastReach + 1) {
        failures.push(`${take.label}: highlight jumped ${lastReach}→${reach} at ${frame.atMs}ms`);
      }
      // Live highlight may not run ahead of what the learner has started saying.
      const started = startedBy(take.spokenStartMs, frame.atMs);
      if (reach > started) {
        failures.push(`${take.label}: highlight ran ahead (${reach} > ${started} started) at ${frame.atMs}ms`);
      }
      if (frame.cap != null && frame.kind === "peek" && (frame.target?.reach ?? 0) > Math.max(frame.cap, lastReach)) {
        failures.push(`${take.label}: peek target ${frame.target?.reach} above cap ${frame.cap}`);
      }
    } else if (frame.kind === "step" && reach > lastReach + 1) {
      failures.push(`${take.label}: final walk jumped ${lastReach}→${reach}`);
    }
    // A miss is never hidden behind the confirmed range: every miss pos is <= frontier.
    for (const pos of frame.painted.missPositions) {
      if (pos > frame.painted.curPos) {
        failures.push(`${take.label}: miss ${pos} painted ahead of frontier ${frame.painted.curPos}`);
      }
    }
    lastReach = reach;
  }
  if (final) {
    if (take.expect.complete != null && final.complete !== take.expect.complete) {
      failures.push(`${take.label}: final complete=${final.complete}, expected ${take.expect.complete}`);
    }
    if (take.expect.firstMissMax != null) {
      const limit = take.words[take.expect.firstMissMax]!.pos;
      if (final.missPos == null || final.missPos > limit) {
        failures.push(`${take.label}: expected an underline at or before pos ${limit} (got ${final.missPos ?? "none"})`);
      }
    }
    const missPos = take.expect.missIndexes.map((index) => take.words[index]!.pos);
    for (const pos of missPos) {
      if (!final.missPositions.includes(pos)) {
        failures.push(`${take.label}: final did not underline missed word pos ${pos} (got ${final.missPositions.join(",") || "none"})`);
      }
    }
    if (!take.expect.missIndexes.length && take.expect.firstMissMax == null && final.missPositions.length) {
      failures.push(`${take.label}: clean take underlined ${final.missPositions.join(",")}`);
    }
    // Final paint ends on the final highlight.
    const last = frames[frames.length - 1];
    if (last && last.painted.reach !== final.reach) {
      failures.push(`${take.label}: final paint stopped at ${last.painted.reach}, expected ${final.reach}`);
    }
  }
  return failures;
}

// ── synthetic takes ─────────────────────────────────────────────────────────

/** Small seeded PRNG so soak failures reproduce. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Plain (undiacritized) spelling an ASR would output for a Mushaf word. */
export function asrSpelling(ar: string): string {
  return String(ar)
    .normalize("NFC")
    .replace(/\u0670/g, "ا")
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED\u0640]/g, "")
    .replace(/ٱ/g, "ا")
    .trim();
}

export type SimulateOptions = {
  seed: number;
  /** Index the learner skips entirely. */
  skip?: number | null;
  /** Index the learner says wrong (a decoy word). */
  wrong?: number | null;
  /** Stop after this many words (take ends early). */
  stopAfter?: number | null;
  /** Chance a fully-said word is dropped from a peek transcript. */
  peekDropRate?: number;
  /** Chance the peek's last word is cut mid-word (garbled). */
  cutRate?: number;
  /** Chance a peek hallucinates the rest of the ayah from the prompt. */
  hallucinateRate?: number;
  /** Chance of a Latin noise token. */
  latinRate?: number;
  /** Chance a two-letter-prefixed word is split in two (يا أيها). */
  splitRate?: number;
  peekEveryMs?: number;
};

const DECOYS = ["قال", "كان", "الذين", "فيها", "عليهم", "ربنا", "يقولون", "موسى"];

/** A wrong word that cannot be confused with any word of this ayah. */
function pickDecoy(words: ExpectedWord[], rng: () => number): string {
  const usable = DECOYS.filter((decoy) => !words.some((word) => arabicEqual(word.ar, decoy)));
  return usable[Math.floor(rng() * usable.length)] ?? "قال";
}

export function simulateTake(words: ExpectedWord[], options: SimulateOptions): SoakTake {
  const rng = mulberry32(options.seed);
  const peekEvery = options.peekEveryMs ?? USTADH_PEEK.intervalMs;
  const leadMs = 300 + Math.floor(rng() * 400);
  const spokenStartMs: (number | null)[] = [];
  const said: { word: string; start: number; end: number; index: number | null }[] = [];
  let t = leadMs;
  const lastIndex = options.stopAfter != null ? Math.min(words.length, options.stopAfter) : words.length;
  for (let index = 0; index < words.length; index++) {
    if (index >= lastIndex || index === options.skip) {
      spokenStartMs.push(null);
      continue;
    }
    const dur = 420 + Math.floor(rng() * 520);
    const text = index === options.wrong ? pickDecoy(words, rng) : asrSpelling(words[index]!.ar);
    spokenStartMs.push(t);
    said.push({ word: text, start: t, end: t + dur, index });
    t += dur + 60 + Math.floor(rng() * 160);
  }
  const endMs = t + 200;

  const toAsr = (rows: typeof said, offset = 0): AsrWord[] =>
    rows.map((row) => ({ word: row.word, start: (row.start - offset) / 1000, end: (row.end - offset) / 1000 }));

  const splitWord = (row: (typeof said)[number]) => {
    const m = /^(يا)(.+)$/.exec(row.word);
    if (!m) return [row];
    const mid = row.start + (row.end - row.start) / 3;
    return [
      { ...row, word: m[1]!, end: mid },
      { ...row, word: m[2]!, start: mid },
    ];
  };

  const peeks: PeekSample[] = [];
  for (let at = peekEvery; at < endMs; at += peekEvery) {
    if (at <= leadMs) continue;
    let rows = said.filter((row) => row.end <= at);
    const partial = said.find((row) => row.start < at && row.end > at);
    rows = rows.filter(() => rng() >= (options.peekDropRate ?? 0));
    if (partial && rng() < (options.cutRate ?? 0)) {
      const cut = partial.word.slice(0, Math.max(1, Math.floor(partial.word.length / 2)));
      rows = [...rows, { ...partial, word: cut, end: at }];
    }
    if (rng() < (options.splitRate ?? 0)) rows = rows.flatMap(splitWord);
    if (rng() < (options.latinRate ?? 0)) {
      rows = [...rows, { word: "amin", start: at - 100, end: at, index: null }];
    }
    let heard = toAsr(rows);
    if (rng() < (options.hallucinateRate ?? 0)) {
      // Whisper completing the ayah from the prompt. Two signatures seen on real
      // Groq output (scripts/ustadh-audio-soak.ts): the missing words squeezed into
      // 20–100 ms slots, or the next word stretched far past the end of the clip.
      const done = new Set(rows.map((row) => row.index));
      const rest = words.filter((word) => !done.has(word.index) && (spokenStartMs[word.index] ?? Infinity) > at);
      const base = Math.max(0, at / 1000 - 0.3);
      if (rng() < 0.6) {
        heard = [
          ...heard,
          ...rest.map((word, i) => {
            const d = 0.02 + rng() * 0.08;
            return { word: asrSpelling(word.ar), start: base + i * 0.1, end: base + i * 0.1 + d };
          }),
        ];
      } else if (rest[0]) {
        heard = [...heard, { word: asrSpelling(rest[0].ar), start: base, end: at / 1000 + 1 + rng() * 2 }];
      }
    }
    peeks.push({ atMs: at, voicedMs: at - leadMs, clipSec: at / 1000, heard });
  }

  const final = toAsr(said);
  const missIndexes: number[] = [];
  if (options.skip != null && options.skip < lastIndex) missIndexes.push(options.skip);
  if (options.wrong != null && options.wrong < lastIndex) missIndexes.push(options.wrong);
  if (lastIndex < words.length) missIndexes.push(lastIndex);
  missIndexes.sort((a, b) => a - b);

  const parts = [
    `seed=${options.seed}`,
    options.skip != null ? `skip=${options.skip}` : "",
    options.wrong != null ? `wrong=${options.wrong}` : "",
    options.stopAfter != null ? `stop=${options.stopAfter}` : "",
  ].filter(Boolean);
  return {
    label: `${words[0]?.verseKey || "?"} ${parts.join(" ")}`,
    words,
    spokenStartMs,
    peeks,
    final,
    expect: {
      complete: lastIndex >= words.length && options.skip !== words.length - 1 && options.wrong !== words.length - 1,
      missIndexes: [...new Set(missIndexes)],
    },
  };
}
