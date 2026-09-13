import { LOOP_COUNTS } from "./constants.ts";

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
