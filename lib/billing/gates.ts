import { PLUS_NAME } from "../brand.ts";

export const FREE_REPEAT_MAX = 2;

export type PlusFeature = "repeats" | "focus" | "relay-qaris";

export const PLUS_COPY: Record<PlusFeature, { title: string; body: string }> = {
  repeats: {
    title: "3× and unlimited word repeats",
    body: "The Repeat button loops the current verse for free, as many times as you like. Playing a word once or twice stays free. Three or more word passes, and looping a word until you stop, are Diras Plus.",
  },
  focus: {
    title: "Focus is included",
    body: "Focus — Drill, Masked, or Relay on one stage — stays free. Diras Plus is 3× word repeats and extra relay qaris.",
  },
  "relay-qaris": {
    title: "More than one qari",
    body: "Relay with you and one qari stays free. Adding a second reciter is Diras Plus.",
  },
};

/** Canonical Plus pitch — Settings row, explanation sheet, and pricing stay in sync. */
export const PLUS_EXPLAIN = {
  rowTitle: `What ${PLUS_NAME} is`,
  rowSub: "Word repeats past ×2, and extra qaris in Relay",
  rowOn: "3× to unlimited word repeats, and extra qaris in Relay",
  lead: "Reading stays free. Focus stays free. Looping a verse with Repeat stays free.",
  freeTitle: "Always free",
  free: [
    "Quran with audio, translation, and tajweed",
    "Focus — Drill, Masked, and Relay with one qari",
    "Repeat under play, looping this verse until you turn it off",
    "A word played once or twice",
  ],
  plusTitle: PLUS_NAME,
  plus: [
    "A word played 3×, 5×, 10×, or until you stop",
    "Relay with more than one qari",
  ],
} as const;

/** Infinite (0) and 3+ repeats are Plus. 1 and 2 stays free. */
export function isPaidRepeat(count: number) {
  return count === 0 || count > FREE_REPEAT_MAX;
}

export function clampRepeat(count: number, plus: boolean) {
  if (plus || !isPaidRepeat(count)) return count;
  return FREE_REPEAT_MAX;
}

export function qariCount(order: { kind?: string }[] | null | undefined) {
  if (!order) return 0;
  return order.filter((p) => p.kind === "qari").length;
}

export function isPaidRelay(order: { kind?: string }[] | null | undefined) {
  return qariCount(order) > 1;
}
