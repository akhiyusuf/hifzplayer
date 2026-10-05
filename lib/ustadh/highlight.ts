import { alignWords } from "./interrupt.ts";
import type { AsrWord, ExpectedWord } from "./types.ts";

/** Rolling ASR peek interval while the learner is still speaking. */
export const USTADH_ROLLING_PEEK_MS = 2_000;

export type UstadhReciteHighlight = {
  /** 1-based Mushaf word pos to mark as current. */
  curPos: number;
  /** Last contiguous matched word pos from the start of the ayah (inclusive). */
  matchedEndPos: number | null;
  /** First mismatched expected word pos, if any. */
  missPos: number | null;
  /** Contiguous match count from ayah start. */
  matchedCount: number;
};

/**
 * Tarteel-style progress: how far contiguous matches reach from the ayah start,
 * plus the frontier / miss word to highlight next.
 */
export function reciteHighlightFromHeard(input: {
  words: ExpectedWord[];
  heard: AsrWord[];
}): UstadhReciteHighlight {
  const words = input.words;
  if (!words.length) {
    return { curPos: 1, matchedEndPos: null, missPos: null, matchedCount: 0 };
  }

  const ops = alignWords(
    words.map((word) => word.ar),
    (input.heard || []).map((word) => word.word),
  );

  let matchedCount = 0;
  let missIndex: number | null = null;

  for (const op of ops) {
    if (op.kind === "ins") continue;
    if (op.kind === "match") {
      if (op.expectedIndex !== matchedCount) break;
      matchedCount += 1;
      continue;
    }
    // Wrong word at the frontier → miss. Trailing deletions mean the take is
    // still incomplete (progressive peek), not a miss yet.
    if (op.kind === "sub" && op.expectedIndex === matchedCount) {
      missIndex = op.expectedIndex;
    }
    break;
  }

  const matchedEndPos = matchedCount > 0 ? words[matchedCount - 1]!.pos : null;
  const frontier = missIndex != null ? missIndex : Math.min(matchedCount, words.length - 1);
  const curPos = words[frontier]?.pos ?? words[0]!.pos;
  const missPos = missIndex != null ? words[missIndex]!.pos : null;

  return { curPos, matchedEndPos, missPos, matchedCount };
}

export type HighlightEngine = {
  getSnapshot: () => { vIdx: number; wordPick?: unknown; curWord?: number };
  notify?: () => void;
  notifyWord?: () => void;
  onWordChange?: (vIdx: number, pos: number) => void;
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

/** Drive Mushaf/Focus `cur` + pin underline from recite progress. */
export function applyUstadhReciteHighlight(
  engine: HighlightEngine,
  vIdx: number,
  highlight: UstadhReciteHighlight,
  firstPos = 1,
): void {
  const st = engine.st;
  if (!st) return;
  st.curWord = highlight.curPos;
  if (highlight.matchedEndPos != null && highlight.matchedEndPos >= firstPos) {
    st.wordPick = {
      start: firstPos,
      end: highlight.matchedEndPos,
      count: null,
      open: null,
      vIdx,
    };
  } else if (highlight.missPos != null) {
    // Pending underline on the miss frontier when nothing matched yet.
    st.wordPick = {
      start: highlight.missPos,
      end: null,
      count: null,
      open: null,
      vIdx,
    };
  } else {
    st.wordPick = {
      start: null,
      end: null,
      count: null,
      open: null,
      vIdx: null,
    };
  }
  if (typeof engine.onWordChange === "function") {
    engine.onWordChange(vIdx, highlight.curPos);
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
