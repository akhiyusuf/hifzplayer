export const MUSHAF_HOT_PAD = 10;
export const MUSHAF_VIEW_PAD = 6;

export type VerseRange = { start: number; end: number };

export function rangeAround(count: number, idx: number, pad: number): VerseRange {
  if (count <= 0) return { start: 0, end: 0 };
  const safe = Math.min(Math.max(0, idx), count - 1);
  return {
    start: Math.max(0, safe - pad),
    end: Math.min(count, safe + pad + 1),
  };
}

export function isInRange(index: number, range: VerseRange) {
  return index >= range.start && index < range.end;
}

export function isHotVerse(index: number, play: VerseRange, view: VerseRange) {
  return isInRange(index, play) || isInRange(index, view);
}

export function viewFromVisible(
  count: number,
  firstVisible: number,
  lastVisible: number,
  pad: number,
): VerseRange {
  if (count <= 0 || lastVisible < firstVisible) return { start: 0, end: 0 };
  return {
    start: Math.max(0, firstVisible - pad),
    end: Math.min(count, lastVisible + 1 + pad),
  };
}
