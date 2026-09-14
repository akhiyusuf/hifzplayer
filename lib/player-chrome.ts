import { KEYS, LOOP_COUNTS, RATES } from "./constants.ts";

export function verseRatioLabel(name: string, verse: number, total: number) {
  const n = Math.max(1, verse || 1);
  const d = Math.max(n, total || n);
  const title = (name || "Surah").trim();
  return `${title} ${n}/${d}`;
}

export function loopCountFace(count: number) {
  return count === 0 ? "∞" : String(count);
}

export function nextLoopCount(count: number) {
  const i = LOOP_COUNTS.indexOf(count as (typeof LOOP_COUNTS)[number]);
  return LOOP_COUNTS[i < 0 ? 0 : (i + 1) % LOOP_COUNTS.length];
}

export function rateFace(rate: number) {
  const n = Number(rate);
  if (!Number.isFinite(n) || n <= 0) return "1×";
  return `${n}×`;
}

export function nextRate(rate: number) {
  const i = RATES.indexOf(rate as (typeof RATES)[number]);
  return RATES[i < 0 ? 1 : (i + 1) % RATES.length];
}

export function wordRepsPlayKind(start: number, end: number) {
  return start === end ? "steps" : "span";
}

export function wordNeedsFollow(
  wordTop: number,
  wordBottom: number,
  viewTop: number,
  viewBottom: number,
  pad = 48,
) {
  return wordTop < viewTop + pad || wordBottom > viewBottom - pad;
}

export function wordIsAway(
  wordTop: number,
  wordBottom: number,
  viewTop: number,
  viewBottom: number,
  pad = 8,
) {
  return wordBottom < viewTop + pad || wordTop > viewBottom - pad;
}

export type SidebarKind = "mushaf" | "focus" | "word" | "masked" | "relay";

export function sidebarKind(style: string, mode: string): SidebarKind {
  if (style === "focus") {
    if (mode === "word") return "word";
    if (mode === "masked") return "masked";
    if (mode === "relay") return "relay";
    return "focus";
  }
  return "mushaf";
}

export type WordTapIntent = "play" | "meaning" | "wordRep";

/** Mushaf opens the word sheet (Play word / Play from here). Focus Word Reps pins. */
export function wordTapIntent(
  style: string,
  mode: string,
  _pointerType?: string | null,
): WordTapIntent {
  if (style === "focus" && mode === "word") return "wordRep";
  if (style === "mushaf") return "meaning";
  return "play";
}

export function spanForVerse(verse: number, count: number) {
  const n = Math.max(1, verse || 1);
  const total = Math.max(n, count || n);
  if (total <= 12) return { from: 1, to: total };
  const to = Math.min(total, n + 9);
  const from = Math.max(1, to - 9);
  return { from, to };
}

/** Home Play loads the whole surah. Settings verse-jump still uses `spanForVerse`. */
export function spanForPlay(versesCount: number) {
  const total = Math.max(1, versesCount || 1);
  return { from: 1, to: total };
}

/** Set up can reopen a saved range. Otherwise it matches Play: the whole surah. */
export function spanForSetup(
  versesCount: number,
  resume?: { from: number; to: number } | null,
) {
  const total = Math.max(1, versesCount || 1);
  const from = resume?.from || 0;
  const to = resume?.to || 0;
  if (from >= 1 && to >= from && to <= total) return { from, to };
  return { from: 1, to: total };
}

export function indexOfVerseInPassage(
  verses: { number: number }[],
  chapter: number,
  passageChapter: number,
  from: number,
  to: number,
  verse: number,
) {
  if (chapter !== passageChapter || verse < from || verse > to) return -1;
  return verses.findIndex((item) => item.number === verse);
}

export const DRILL_HINT_MS = 10_000;

export const DRILL_HINTS = {
  word: "Tap a word. Pin a range, or pick 5×, 10×, or ∞, then play.",
  masked: "Words are covered. Peek if you need a look.",
  relay: "Recite your ayah. The reciter takes the next.",
} as const;

export const WORD_REP_COUNTS = [5, 10, 0] as const;

export function sortedWordRange(a: number, b: number) {
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}

export function nextWordInRange(w: number, end: number) {
  return w < end ? w + 1 : null;
}

export function wordRangePassComplete(pass: number, passes: number) {
  if (passes === 0) return false;
  return pass >= passes;
}

export function wordRepsDoneState() {
  return {
    loop: null as null,
    playing: false,
    wordPick: { start: null as null, end: null as null, count: null as null, open: null as null },
    wordStep: { active: false, w: 1, playedTimes: 0, range: null as null },
  };
}

/** Skip to another Relay seat without wrapping into a new round. */
export function wrapRelayIndex(idx: number, len: number, delta: number) {
  if (len <= 0) return 0;
  const n = idx + delta;
  if (n < 0) return len - 1;
  if (n >= len) return 0;
  return n;
}

export function nextVerseInLoop(current: number, from: number, to: number) {
  if (current < to) return current + 1;
  return from;
}

export function drillHint(mode: string) {
  if (mode === "word" || mode === "masked" || mode === "relay") return DRILL_HINTS[mode];
  return "";
}

export function coversRange(verses: { number: number }[], from: number, to: number) {
  if (from > to) return false;
  const have = new Set(verses.map((verse) => verse.number));
  for (let n = from; n <= to; n++) {
    if (!have.has(n)) return false;
  }
  return true;
}

export type ExclusiveJobKeep = "verseLoop" | "word" | null;

/** Stop every other playback job so only one drill/loop runs. */
export function exclusiveJobPatch(keep: ExclusiveJobKeep = null) {
  return {
    oneshot: null as null,
    focusPhrase: 0,
    ...(keep === "verseLoop"
      ? {}
      : { verseLoop: false as const, verseLoopRange: null as null }),
    ...(keep === "word"
      ? {}
      : {
          loop: null as null,
          pendingLoopStart: null as null,
          wordPick: { start: null, end: null, count: null, open: null },
          wordStep: { active: false, w: 1, playedTimes: 0, range: null as null },
        }),
  };
}

export const PLAYER_LAYERS = [
  "settings",
  "meaning",
  "reciter",
  "practice",
  "relay",
  "phrase",
  "twin",
  "range",
  "repeat",
  "plus",
] as const;

export type PlayerLayer = (typeof PLAYER_LAYERS)[number];

/** Only one sheet, pop, or gate stays open. */
export function exclusiveLayer(keep: PlayerLayer | null): Set<PlayerLayer> {
  return keep ? new Set([keep]) : new Set();
}

export const RELAY_ROUNDS = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 0, label: "Until I stop" },
] as const;

export type RelaySeat = { kind: "you" } | { kind: "qari"; reciterId: number };

export type RelayDraft = {
  chapter?: number;
  order: RelaySeat[];
  vFrom: number;
  vTo: number;
  rounds: number;
  start?: boolean;
};

export function readRelayDraft(): RelayDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEYS.relayDraft);
    if (!raw) return null;
    const draft = JSON.parse(raw) as RelayDraft;
    if (!Array.isArray(draft?.order) || !draft.vFrom || !draft.vTo) return null;
    return draft;
  } catch {
    return null;
  }
}

export function writeRelayDraft(draft: RelayDraft) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(KEYS.relayDraft, JSON.stringify(draft));
  } catch {
    /* private mode */
  }
}
