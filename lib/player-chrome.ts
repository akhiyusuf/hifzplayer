import { KEYS, LOOP_COUNTS, RATES } from "./constants.ts";
import { getStore } from "./storage.ts";

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

export type WordPick = {
  start: number | null;
  end: number | null;
  count: number | null;
  open: number | null;
  vIdx?: number | null;
  /** Pulse the 5× / 10× / ∞ row after the end of a range is pinned. */
  nudge?: boolean;
};

export type MushafWordTapKind = "meaning" | "offerEnd" | "keepBar";

/** Mushaf: last-word Pin+X, then keep the first-word multiplier bar. */
export function mushafWordTapKind(
  pick: WordPick | null | undefined,
  pos: number,
  verseIdx: number,
): MushafWordTapKind {
  if (!pick || pick.start == null) return "meaning";
  if (pick.vIdx != null && pick.vIdx !== verseIdx) return "meaning";
  if (pick.open != null && pick.open === pos) return "keepBar";
  if (pick.end == null && pos !== pick.start) return "offerEnd";
  return "meaning";
}

/** After Word Reps, resume recitation at the last word that played. */
export function wordRepsResumeWord(st: {
  loop?: { endW?: number } | null;
  wordPick?: { end?: number | null; start?: number | null } | null;
  wordStep?: { range?: { endW?: number } | null; w?: number };
  curWord?: number;
}) {
  return (
    (st.loop && st.loop.endW) ||
    (st.wordPick && st.wordPick.end) ||
    (st.wordStep && st.wordStep.range && st.wordStep.range.endW) ||
    (st.wordStep && st.wordStep.w) ||
    st.curWord ||
    1
  );
}

/** Mushaf 5× / 10× / ∞: a completed pin, else pin-start→this word, else this word. */
export function mushafRepSpan(
  pick: { start: number | null; end: number | null } | null | undefined,
  pos: number,
) {
  if (!pick || pick.start == null) return { start: pos, end: pos };
  if (pick.end != null) return sortedWordRange(pick.start, pick.end);
  return sortedWordRange(pick.start, pos);
}

/** Underline a Mushaf pin before / during Word Reps. */
export function mushafPinHighlight(
  vIdx: number,
  currentIdx: number,
  pick: { start: number | null; end: number | null; vIdx?: number | null } | null | undefined,
): { start: number; end: number; pending: number } | null {
  if (vIdx !== currentIdx || !pick || pick.start == null) return null;
  if (pick.vIdx != null && pick.vIdx !== vIdx) return null;
  if (pick.end == null) {
    return { start: pick.start, end: pick.start, pending: pick.start };
  }
  return { start: pick.start, end: pick.end, pending: 0 };
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

export type PlayerPageKind = "mushaf" | "focus" | "word" | "masked" | "relay";

/**
 * Mushaf always keeps the page of ayahs, including Relay.
 * Focus drills (Word Reps, Masked, Relay) swap in a dedicated stage.
 */
export function playerPageKind(
  style: string,
  mode: string,
  relayActive = false,
): PlayerPageKind {
  if (style === "mushaf") return "mushaf";
  if (mode === "relay" && relayActive) return "relay";
  if (mode === "masked") return "masked";
  if (mode === "word") return "word";
  return "focus";
}

export type WordPopActions = { play: boolean; reps: boolean };

/**
 * Verse (base): Play word + Play from here.
 * Word Reps: Pin + 5× / 10× / ∞.
 * Same rules on mushaf and Focus. Masked / other drills show neither.
 */
export function wordPopActions(_style: string, mode: string): WordPopActions {
  if (mode === "word") return { play: false, reps: true };
  if (mode === "verse") return { play: true, reps: false };
  return { play: false, reps: false };
}

/** Pin / multiplier chrome belongs on Word Reps only. */
export function wordRepChromeVisible(mode: string) {
  return mode === "word";
}

export function mushafMaskReveal(opts: {
  mode: string;
  verseIdx: number;
  currentIdx: number;
  wordCount: number;
  currentReveal: number;
  verseDone: boolean;
  /** Live playing word — reveal it even if `currentReveal` is a stale snapshot. */
  curWord?: number;
}) {
  if (opts.mode !== "masked") return { masked: false, revealUpTo: 0 };
  if (opts.verseDone || opts.verseIdx < opts.currentIdx) {
    return { masked: true, revealUpTo: opts.wordCount };
  }
  if (opts.verseIdx === opts.currentIdx) {
    return {
      masked: true,
      revealUpTo: Math.max(opts.currentReveal, opts.curWord || 0),
    };
  }
  return { masked: true, revealUpTo: 0 };
}

/** Prev/next dest inside the loaded passage, or null at either end. */
export function destIndexInPassage(vIdx: number, len: number, delta: number) {
  const dest = vIdx + delta;
  if (dest < 0 || dest >= len) return null;
  return dest;
}

export type VerseMaskState = {
  maxRev: number;
  peeks: number;
  peekRev: number;
};

/** Start Masked on an ayah from its first word. Keeps leftover peek count. */
export function freshMaskForVerse(peeks = 3): VerseMaskState {
  return { maxRev: 0, peeks, peekRev: 0 };
}

/**
 * After skip or an ayah-number jump, dest ayah is current, not done,
 * reveal from the start. Mode stays `masked`.
 */
export function maskedSkipReveal(
  destIdx: number,
  wordCount: number,
  curWord = 0,
) {
  return {
    mode: "masked" as const,
    ...mushafMaskReveal({
      mode: "masked",
      verseIdx: destIdx,
      currentIdx: destIdx,
      wordCount,
      currentReveal: 0,
      verseDone: false,
      curWord,
    }),
  };
}

/** Settings verse jump and mushaf ayah-number taps use the same dest restart as skip. */
export function maskedJumpReveal(
  destIdx: number,
  wordCount: number,
  curWord = 0,
) {
  return maskedSkipReveal(destIdx, wordCount, curWord);
}

export function shouldRestartMaskOnJump(mode: string) {
  return mode === "masked";
}

/** Mushaf word slots are tappable except in Masked. */
export function mushafWordsInteractive(mode?: string) {
  return mode !== "masked";
}

/**
 * Mushaf always opens the word sheet (play actions in verse, pin/reps in Word Reps).
 * Focus verse opens that same sheet. Focus Word Reps uses the pin bar.
 */
export function wordTapIntent(
  style: string,
  mode: string,
  _pointerType?: string | null,
): WordTapIntent {
  if (style === "mushaf") return "meaning";
  if (mode === "word") return "wordRep";
  return "meaning";
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
  masked: "Words stay in their slots and stay invisible until their turn.",
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

export function emptyWordPick() {
  return {
    start: null as null,
    end: null as null,
    count: null as null,
    open: null as null,
    vIdx: null as null,
  };
}

export function wantsTranslation() {
  const stored = getStore(KEYS.showTranslation);
  return stored == null || stored;
}

export function scrollPlayerToVerse(idx: number) {
  if (typeof document === "undefined" || idx < 0) return;
  requestAnimationFrame(() => {
    const el = document.querySelector(`.shell.player [data-vi="${idx}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

export function wordRepsDoneState() {
  return {
    mode: "verse" as const,
    loop: null as null,
    playing: false,
    wordPick: emptyWordPick(),
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
          wordPick: { start: null, end: null, count: null, open: null, vIdx: null },
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

export type RelayTurn = {
  kind: "you" | "qari";
  reciterId: number;
  verseKey: string;
};

export const DEFAULT_RELAY_ROUNDS = 2;

/** Reciter starts, then you — the setup sheet's empty state. */
export function defaultRelayOrder(reciterId: number): RelaySeat[] {
  return [{ kind: "qari", reciterId }, { kind: "you" }];
}

export function defaultRelaySetup(
  reciterId: number,
  vFrom: number,
  vTo: number,
  rounds = DEFAULT_RELAY_ROUNDS,
): RelayDraft {
  return {
    order: defaultRelayOrder(reciterId),
    vFrom,
    vTo,
    rounds,
  };
}

export function relayStartsWith(order: RelaySeat[] | null | undefined): "you" | "qari" {
  return order?.[0]?.kind === "you" ? "you" : "qari";
}

/** Move an existing You/reciter seat to the front, or insert one. */
export function orderStartingWith(
  order: RelaySeat[],
  start: "you" | "qari",
  reciterId: number,
): RelaySeat[] {
  const copy = order.slice();
  const idx = copy.findIndex((seat) => seat.kind === start);
  if (idx === 0) return copy;
  if (idx > 0) {
    const [seat] = copy.splice(idx, 1);
    copy.unshift(seat);
    return copy;
  }
  copy.unshift(start === "you" ? { kind: "you" } : { kind: "qari", reciterId });
  return copy;
}

export function relayRoundLabel(round: number, rounds: number) {
  if (!rounds) return `Round ${round}`;
  return `Round ${round} of ${rounds}`;
}

export function relayWhoseTurn(turn: { kind?: string } | null | undefined): "you" | "qari" {
  return turn?.kind === "you" ? "you" : "qari";
}

export function relayTurnName(
  kind: "you" | "qari",
  reciterName: string,
) {
  if (kind === "you") return "You";
  const first = (reciterName || "Reciter").trim().split(/\s+/)[0];
  return first || "Reciter";
}

/** Walk the passage in seat order, rotating who starts each round. */
export function buildRelayTurns(
  verses: { number: number; key: string }[],
  from: number,
  to: number,
  order: RelaySeat[],
  startOffset: number,
  fallbackReciterId: number,
): RelayTurn[] {
  const span = verses.filter((verse) => verse.number >= from && verse.number <= to);
  if (!order.length) return [];
  const shift = (startOffset - 1) % order.length;
  const firstQari = order.find((seat) => seat.kind === "qari");
  let reciterId = firstQari && firstQari.kind === "qari" ? firstQari.reciterId : fallbackReciterId;
  const turns: RelayTurn[] = [];
  for (let i = 0; i < span.length; i++) {
    const seat = order[(i + shift) % order.length];
    if (seat.kind === "qari") {
      reciterId = seat.reciterId;
      turns.push({ kind: "qari", reciterId: seat.reciterId, verseKey: span[i].key });
    } else {
      turns.push({ kind: "you", reciterId, verseKey: span[i].key });
    }
  }
  return turns;
}

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
