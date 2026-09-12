import { PLUS_NAME } from "../brand.ts";

export const FREE_REPEAT_MAX = 2;

export type PlusFeature = "repeats" | "focus" | "relay-qaris" | "playlists";

export const PLUS_COPY: Record<PlusFeature, { title: string; body: string }> = {
  repeats: {
    title: "3× and unlimited word repeats",
    body: "The Repeat button loops the current verse for free, as many times as you like. Playing a word once or twice stays free. Three or more word passes, and looping a word until you stop, are Diras Plus.",
  },
  focus: {
    title: "Focus is Diras Plus",
    body: "You can open Focus and look around for free. Playing the verse, and Drill, Masked, or Relay, are Diras Plus. Leave whenever you like — Mushaf reading stays free.",
  },
  "relay-qaris": {
    title: "More than one qari",
    body: "Relay is part of Focus, which is Diras Plus. Adding a second reciter is also Diras Plus.",
  },
  playlists: {
    title: "Listen lists are Diras Plus",
    body: "You can open Listen and look around for free. Playing an occasion list is Diras Plus. Mushaf reading stays free.",
  },
};

/** Canonical Plus pitch — Settings row, explanation sheet, and pricing stay in sync. */
export const PLUS_EXPLAIN = {
  rowTitle: `What ${PLUS_NAME} is`,
  rowSub: "Focus practice, listen lists, word repeats past ×2, and extra qaris in Relay",
  rowOn: "Focus, listen lists, 3× to unlimited word repeats, and extra qaris in Relay",
  lead: "Reading stays free. Looping a verse with Repeat stays free. You can open Focus and Listen and look around.",
  freeTitle: "Always free",
  free: [
    "Quran with audio, translation, and tajweed",
    "Repeat under play, looping this verse until you turn it off",
    "A word played once or twice",
    "Colour themes — orange, green, black and white, pink, and gold",
    "Opening Focus or Listen and leaving",
  ],
  plusTitle: PLUS_NAME,
  plus: [
    "Play, Drill, Masked, and Relay in Focus",
    "Occasion lists — Friday, night, morning, and the rest",
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

/** Drill, Masked, and Relay. Opening the Focus view itself stays free. */
export function isPaidFocusJob(mode: string | null | undefined) {
  return mode === "word" || mode === "masked" || mode === "relay";
}
