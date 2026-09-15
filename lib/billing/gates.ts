import { PLUS_NAME } from "../brand.ts";

export const FREE_REPEAT_MAX = 2;

export type PlusFeature = "repeats" | "practice" | "relay-qaris" | "playlists";

/** @deprecated Use "practice" — kept so older call sites still resolve copy. */
export type LegacyPlusFeature = PlusFeature | "focus";

export const PLUS_COPY: Record<PlusFeature, { title: string; body: string }> = {
  repeats: {
    title: "3× and unlimited word repeats",
    body: "The Repeat button loops this verse, or a range of verses, for free, as many times as you like. Playing a word once or twice stays free. Three or more word passes, and looping a word until you stop, are Diras Plus.",
  },
  practice: {
    title: "Word Reps, Masked, and Relay",
    body: "Mushaf and Focus views stay free — including play. Word Reps, Masked, and Relay are Diras Plus. Leave whenever you like — reading stays free.",
  },
  "relay-qaris": {
    title: "More than one qari",
    body: "Relay is Diras Plus. Adding a second reciter is also Diras Plus.",
  },
  playlists: {
    title: "Playlists are Diras Plus",
    body: "You can open Playlists and look around for free. Playing an occasion list is Diras Plus. Mushaf reading stays free.",
  },
};

/** Map legacy "focus" asks onto the practice feature. */
export function plusCopyFor(feature: LegacyPlusFeature) {
  if (feature === "focus") return PLUS_COPY.practice;
  return PLUS_COPY[feature];
}

/** Canonical Plus pitch — Settings row, explanation sheet, and pricing stay in sync. */
export const PLUS_EXPLAIN = {
  rowTitle: `What ${PLUS_NAME} is`,
  rowSub: "Word Reps, Masked, Relay, playlists, word repeats past ×2, and extra qaris",
  rowOn: "Word Reps, Masked, Relay, playlists, 3× to unlimited word repeats, and extra qaris",
  lead: "Reading stays free. Mushaf and Focus views stay free — including play. Looping a verse with Repeat stays free. You can open Playlists and look around.",
  freeTitle: "Always free",
  free: [
    "Quran with audio, translation, and tajweed",
    "Mushaf view and Focus view, including play",
    "Repeat on the player, this verse or a range of verses, until you turn it off",
    "A word played once or twice",
    "Colour themes — orange, green, black and white, pink, and gold",
    "Opening Playlists and leaving",
  ],
  plusTitle: PLUS_NAME,
  plus: [
    "Word Reps, Masked, and Relay on Mushaf or Focus",
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

/** Word Reps, Masked, and Relay — the Focus *view* itself stays free. */
export function isPaidFocusJob(mode: string | null | undefined) {
  return mode === "word" || mode === "masked" || mode === "relay";
}
