import { KEYS, LOOP_COUNTS } from "./constants.ts";

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

export function spanForVerse(verse: number, count: number) {
  const n = Math.max(1, verse || 1);
  const total = Math.max(n, count || n);
  if (total <= 12) return { from: 1, to: total };
  const to = Math.min(total, n + 9);
  const from = Math.max(1, to - 9);
  return { from, to };
}

export const DRILL_HINT_MS = 10_000;

export const DRILL_HINTS = {
  word: "Tap a word, then choose how many times it plays.",
  masked: "Words are covered. Peek if you need a look.",
  relay: "Recite your ayah. The reciter takes the next.",
} as const;

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
