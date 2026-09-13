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
