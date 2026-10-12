export type WordSeg = { w: number; start: number; end: number; est?: boolean };

export function parseSegments(raw: unknown, wordCount?: number): WordSeg[] | null {
  if (!Array.isArray(raw) || !raw.length) return null;
  let out: WordSeg[] = [];
  for (const t of raw) {
    if (!Array.isArray(t) || t.length < 3) continue;
    let w = Number(t[0]);
    let start = Number(t[t.length - 2]);
    let end = Number(t[t.length - 1]);
    if (!isFinite(w) || !isFinite(start) || !isFinite(end)) continue;
    if (end < start) {
      const tmp = start;
      start = end;
      end = tmp;
    }
    out.push({ w, start: start / 1000, end: end / 1000 });
  }
  if (!out.length) return null;
  const ws = out.map((s) => s.w);
  if (ws.includes(0) || (wordCount && Math.max(...ws) === wordCount - 1 && !ws.includes(wordCount))) {
    for (const s of out) s.w += 1;
  }
  if (wordCount) out = out.filter((s) => s.w >= 1 && s.w <= wordCount);
  if (!out.length) return null;
  out.sort((a, b) => a.start - b.start);
  return out;
}

function estimateSegments(duration: number, wordCount: number): WordSeg[] | null {
  if (!isFinite(duration) || duration <= 0 || !wordCount) return null;
  const per = duration / wordCount;
  const out: WordSeg[] = [];
  for (let i = 0; i < wordCount; i++) {
    out.push({ w: i + 1, start: i * per, end: (i + 1) * per, est: true });
  }
  return out;
}

export function segsForVerse(
  verse: { audio?: { segments?: WordSeg[] | null } | null; words?: unknown[]; _est?: WordSeg[] | null; _estDur?: number },
  isCurrent: boolean,
  duration: number,
): WordSeg[] | null {
  const a = verse.audio;
  if (!a) return null;
  if (a.segments && a.segments.length) return a.segments;
  if (isCurrent && isFinite(duration) && duration > 0) {
    if (!verse._est || verse._estDur !== duration) {
      verse._est = estimateSegments(duration, verse.words?.length || 0);
      verse._estDur = duration;
    }
    return verse._est || null;
  }
  return null;
}

export function wordAt(segs: WordSeg[] | null | undefined, t: number): number {
  if (!segs) return 0;
  let cur = 0;
  for (const s of segs) {
    if (t >= s.start - 0.02) cur = s.w;
    if (t < s.end) break;
  }
  return cur;
}

export function segForWord(segs: WordSeg[] | null | undefined, w: number): WordSeg | null {
  if (!segs) return null;
  for (const s of segs) if (s.w === w) return s;
  return null;
}

export function fmtTime(t: number): string {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function toArabicDigits(n: number | string): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}
