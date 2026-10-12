import { PLUS_NAME } from "../brand.ts";
import { USTADH_ENABLED } from "../ustadh/enabled.ts";

export const FREE_REPEAT_MAX = 2;

export type PlusFeature = "repeats" | "practice" | "relay-qaris" | "playlists" | "planner";

/** @deprecated Use "practice" — kept so older call sites still resolve copy. */
export type LegacyPlusFeature = PlusFeature | "focus";

export const PLUS_COPY: Record<PlusFeature, { title: string; body: string }> = {
  repeats: {
    title: "3× and unlimited word repeats",
    body: "Word repeats are free at every count — 3×, 5×, 10×, or until you stop. Diras Plus adds the memorization planner and playlists.",
  },
  practice: {
    title: "Word Reps, Masked, and Relay",
    body: "Mushaf and Focus views stay free — including play. Word Reps, Masked, and Relay are free too. Diras Plus adds the memorization planner and playlists.",
  },
  "relay-qaris": {
    title: "More than one qari",
    body: "Relay is free with as many qaris as you like. Diras Plus adds the memorization planner and playlists.",
  },
  playlists: {
    title: "Playlists are Diras Plus",
    body: "Playing an occasion list is Diras Plus. Mushaf reading stays free.",
  },
  planner: {
    title: "Memorization planner",
    body: "A daily New / Review / Revision plan for your hifz. Set a surah, practise a few ayahs a day, and we bring them back before you forget. Reading stays free.",
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
  rowSub: "Memorization planner and playlists",
  rowOn: "Memorization planner and playlists",
  lead: "Reading stays free. Mushaf and Focus views stay free — including play. Word Reps, Masked, and Relay are free. Looping a verse with Repeat stays free. You can open Playlists and look around.",
  freeTitle: "Always free",
  free: [
    "Quran with audio, translation, and tajweed",
    "Mushaf view and Focus view, including play",
    "Word Reps, Masked, and Relay on Mushaf or Focus",
    "Repeat on the player, this verse or a range of verses, until you turn it off",
    "Word repeats — 3×, 5×, 10×, or until you stop",
    "Relay with more than one qari",
    "Colour themes — orange, green, black and white, pink, and gold",
    "Opening Playlists and leaving",
  ],
  plusTitle: PLUS_NAME,
  plus: [
    "Memorization planner — New, Review, and Revision for the day",
    "Occasion lists — Friday, night, morning, and the rest",
    "AI Ustadh recite coach — coming soon",
  ],
} as const;

/** Word repeats are free at every count, including unlimited. */
export function isPaidRepeat(_count: number) {
  return false;
}

export function clampRepeat(count: number, _plus: boolean) {
  return count;
}

export function qariCount(order: { kind?: string }[] | null | undefined) {
  if (!order) return 0;
  return order.filter((p) => p.kind === "qari").length;
}

/** Relay is free with any number of qaris. */
export function isPaidRelay(_order: { kind?: string }[] | null | undefined) {
  return false;
}

/** No Focus job is Plus any more — Word Reps, Masked, and Relay are free. */
export function isPaidFocusJob(_mode: string | null | undefined) {
  return false;
}

/** Free practice jobs (no Plus). Verse, Word Reps, Masked, Relay; AI Ustadh when enabled. */
export function isFreePracticeJob(mode: string | null | undefined) {
  if (mode === "verse" || mode === "word" || mode === "masked" || mode === "relay") return true;
  if (mode === "ustadh") return USTADH_ENABLED;
  return false;
}
