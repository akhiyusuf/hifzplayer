/** Memorization planner — localStorage plan + spaced-repetition schedule (pure). */

export const PLAN_STORAGE_KEY = "hifz.plan";
export const AYAH_STATE_STORAGE_KEY = "hifz.ayahState";

export const AYAH_PER_DAY_OPTIONS = [1, 2, 3, 5, 10] as const;
export type AyahsPerDay = (typeof AYAH_PER_DAY_OPTIONS)[number];

/** Days until next review after each successful pass (step 0 = just learned). */
export const LADDER_DAYS = [1, 2, 4, 7, 14, 30] as const;

/** Sabqi window: learned within this many days → Review; older → Revision. */
export const REVIEW_WINDOW_DAYS = 7;
export const REVIEW_WINDOW_MS = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

export type PracticePlan = {
  surah: number;
  from: number;
  to: number;
  ayahsPerDay: AyahsPerDay;
  createdAt: number;
};

export type AyahMemState = {
  learnedAt: number;
  step: number;
  dueAt: number;
};

export type AyahStateMap = Record<string, AyahMemState>;

export type TodayBucket = "new" | "review" | "revision";

export type TodayQueues = {
  newAyahs: number[];
  reviewAyahs: number[];
  revisionAyahs: number[];
};

export function ayahKey(surah: number, ayah: number): string {
  return `${surah}:${ayah}`;
}

export function parseAyahKey(key: string): { surah: number; ayah: number } | null {
  const m = /^(\d+):(\d+)$/.exec(key);
  if (!m) return null;
  const surah = Number(m[1]);
  const ayah = Number(m[2]);
  if (!Number.isFinite(surah) || !Number.isFinite(ayah) || surah < 1 || ayah < 1) return null;
  return { surah, ayah };
}

export function addDays(ms: number, days: number): number {
  return ms + days * DAY_MS;
}

export function ladderDaysForStep(step: number): number {
  const i = Math.max(0, Math.min(Math.floor(step), LADDER_DAYS.length - 1));
  return LADDER_DAYS[i]!;
}

export function isAyahsPerDay(n: number): n is AyahsPerDay {
  return (AYAH_PER_DAY_OPTIONS as readonly number[]).includes(n);
}

/** Normalize / validate a plan payload. Returns null if unusable. */
export function normalizePlan(
  raw: unknown,
  versesCount?: number,
): PracticePlan | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const surah = Number(o.surah);
  const from = Number(o.from);
  const to = Number(o.to);
  const ayahsPerDay = Number(o.ayahsPerDay);
  const createdAt = Number(o.createdAt);
  if (!Number.isFinite(surah) || surah < 1 || surah > 114) return null;
  if (!Number.isFinite(from) || from < 1) return null;
  if (!Number.isFinite(to) || to < from) return null;
  if (!isAyahsPerDay(ayahsPerDay)) return null;
  if (!Number.isFinite(createdAt) || createdAt <= 0) return null;
  const max = versesCount && versesCount > 0 ? versesCount : to;
  const clampedTo = Math.min(to, max);
  const clampedFrom = Math.min(from, clampedTo);
  return {
    surah: Math.floor(surah),
    from: Math.floor(clampedFrom),
    to: Math.floor(clampedTo),
    ayahsPerDay,
    createdAt: Math.floor(createdAt),
  };
}

export function createPlan(input: {
  surah: number;
  from: number;
  to: number;
  ayahsPerDay: number;
  now?: number;
}): PracticePlan | null {
  const now = input.now ?? Date.now();
  return normalizePlan({
    surah: input.surah,
    from: input.from,
    to: input.to,
    ayahsPerDay: input.ayahsPerDay,
    createdAt: now,
  });
}

export function normalizeAyahState(raw: unknown): AyahStateMap {
  if (!raw || typeof raw !== "object") return {};
  const out: AyahStateMap = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!parseAyahKey(key)) continue;
    if (!val || typeof val !== "object") continue;
    const v = val as Record<string, unknown>;
    const learnedAt = Number(v.learnedAt);
    const step = Number(v.step);
    const dueAt = Number(v.dueAt);
    if (!Number.isFinite(learnedAt) || learnedAt <= 0) continue;
    if (!Number.isFinite(dueAt) || dueAt <= 0) continue;
    if (!Number.isFinite(step) || step < 0) continue;
    out[key] = {
      learnedAt: Math.floor(learnedAt),
      step: Math.floor(step),
      dueAt: Math.floor(dueAt),
    };
  }
  return out;
}

export function markLearned(_prev: AyahMemState | undefined, now: number): AyahMemState {
  return {
    learnedAt: now,
    step: 0,
    dueAt: addDays(now, ladderDaysForStep(0)),
  };
}

export function markGotIt(prev: AyahMemState, now: number): AyahMemState {
  const nextStep = Math.min(prev.step + 1, LADDER_DAYS.length - 1);
  return {
    learnedAt: prev.learnedAt,
    step: nextStep,
    dueAt: addDays(now, ladderDaysForStep(nextStep)),
  };
}

/** Shaky resets the ladder to the first interval. */
export function markShaky(prev: AyahMemState, now: number): AyahMemState {
  return {
    learnedAt: prev.learnedAt,
    step: 0,
    dueAt: addDays(now, ladderDaysForStep(0)),
  };
}

export function isDue(state: AyahMemState, now: number): boolean {
  return state.dueAt <= now;
}

export function isRecentLearned(state: AyahMemState, now: number): boolean {
  return now - state.learnedAt <= REVIEW_WINDOW_MS;
}

export function planAyahList(plan: PracticePlan): number[] {
  const out: number[] = [];
  for (let a = plan.from; a <= plan.to; a++) out.push(a);
  return out;
}

export function planTotal(plan: PracticePlan): number {
  return Math.max(0, plan.to - plan.from + 1);
}

export function memorizedCount(plan: PracticePlan, state: AyahStateMap): number {
  let n = 0;
  for (const a of planAyahList(plan)) {
    if (state[ayahKey(plan.surah, a)]?.learnedAt) n++;
  }
  return n;
}

export function nextNewAyahs(plan: PracticePlan, state: AyahStateMap, limit?: number): number[] {
  const n = limit ?? plan.ayahsPerDay;
  const out: number[] = [];
  for (const a of planAyahList(plan)) {
    if (out.length >= n) break;
    if (!state[ayahKey(plan.surah, a)]?.learnedAt) out.push(a);
  }
  return out;
}

/** Learned within last 7 days and due. */
export function dueReviewAyahs(plan: PracticePlan, state: AyahStateMap, now: number): number[] {
  const out: number[] = [];
  for (const a of planAyahList(plan)) {
    const s = state[ayahKey(plan.surah, a)];
    if (!s?.learnedAt) continue;
    if (!isDue(s, now)) continue;
    if (isRecentLearned(s, now)) out.push(a);
  }
  return out;
}

/** Older than 7 days and due. */
export function dueRevisionAyahs(plan: PracticePlan, state: AyahStateMap, now: number): number[] {
  const out: number[] = [];
  for (const a of planAyahList(plan)) {
    const s = state[ayahKey(plan.surah, a)];
    if (!s?.learnedAt) continue;
    if (!isDue(s, now)) continue;
    if (!isRecentLearned(s, now)) out.push(a);
  }
  return out;
}

export function todayQueues(plan: PracticePlan, state: AyahStateMap, now: number): TodayQueues {
  return {
    newAyahs: nextNewAyahs(plan, state),
    reviewAyahs: dueReviewAyahs(plan, state, now),
    revisionAyahs: dueRevisionAyahs(plan, state, now),
  };
}

/** Contiguous runs of ayah numbers → { from, to } spans. */
export function ayahSpans(ayahs: number[]): { from: number; to: number }[] {
  if (!ayahs.length) return [];
  const sorted = [...ayahs].sort((a, b) => a - b);
  const spans: { from: number; to: number }[] = [];
  let from = sorted[0]!;
  let to = sorted[0]!;
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i]!;
    if (a === to + 1) {
      to = a;
    } else {
      spans.push({ from, to });
      from = a;
      to = a;
    }
  }
  spans.push({ from, to });
  return spans;
}

export function primarySpan(ayahs: number[]): { from: number; to: number } | null {
  const spans = ayahSpans(ayahs);
  return spans[0] ?? null;
}

/** Deep-link into the reader for a plan range (user picks Word Reps / Masked / Relay). */
export function practiceRangeHref(surah: number, from: number, to: number): string {
  const q = new URLSearchParams();
  q.set("from", String(Math.max(1, Math.floor(from))));
  q.set("to", String(Math.max(from, Math.floor(to))));
  q.set("back", "practice");
  return `/read/${Math.max(1, Math.floor(surah))}?${q.toString()}`;
}

export function formatAyahRange(from: number, to: number): string {
  return to > from ? `${from}–${to}` : String(from);
}

export function applyAyahOutcome(
  state: AyahStateMap,
  surah: number,
  ayahs: number[],
  outcome: "learned" | "gotIt" | "shaky",
  now: number,
): AyahStateMap {
  const next = { ...state };
  for (const a of ayahs) {
    const key = ayahKey(surah, a);
    const prev = next[key];
    if (outcome === "learned") {
      next[key] = markLearned(prev, now);
    } else if (outcome === "gotIt") {
      if (!prev) continue;
      next[key] = markGotIt(prev, now);
    } else {
      if (!prev) continue;
      next[key] = markShaky(prev, now);
    }
  }
  return next;
}
