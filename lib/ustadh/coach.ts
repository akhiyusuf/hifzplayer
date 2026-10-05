import type { Verse } from "../types.ts";
import type { ReplayDecision, UstadhAsrResponse } from "./types.ts";
import { expectedFromVerse } from "./units.ts";

export type UstadhCoachStatus =
  | "idle"
  | "listening"
  | "checking"
  | "matched"
  | "miss"
  | "error";

export type UstadhCoachErrorCode =
  | "MIC_DENIED"
  | "MIC_UNAVAILABLE"
  | "ASR_NOT_CONFIGURED"
  | "NETWORK"
  | "ASR_UPSTREAM"
  | "EMPTY_CLIP"
  | "UNKNOWN";

/** Status chip copy for the practice strip. */
export function ustadhStatusLabel(status: UstadhCoachStatus, errorCode?: string | null): string {
  switch (status) {
    case "listening":
      return "Listening…";
    case "checking":
      return "Checking…";
    case "matched":
      return "Matched";
    case "miss":
      return "Miss — listen and try again";
    case "error":
      if (errorCode === "MIC_DENIED") return "Mic blocked";
      if (errorCode === "MIC_UNAVAILABLE") return "Mic unavailable";
      if (errorCode === "ASR_NOT_CONFIGURED") return "Coach offline";
      if (errorCode === "NETWORK") return "Network error";
      if (errorCode === "EMPTY_CLIP") return "No audio caught";
      return "Couldn’t check";
    default:
      return "Ready";
  }
}

export function ustadhErrorHint(code: UstadhCoachErrorCode | string | null | undefined): string {
  switch (code) {
    case "MIC_DENIED":
      return "Allow the microphone for this site, then tap Listen again.";
    case "MIC_UNAVAILABLE":
      return "This browser can’t open the mic. Try Chrome or Safari on HTTPS.";
    case "ASR_NOT_CONFIGURED":
      return "Speech check isn’t set up on this deploy yet.";
    case "NETWORK":
      return "Check your connection and try again.";
    case "EMPTY_CLIP":
      return "Hold a little longer, then tap Send.";
    case "ASR_UPSTREAM":
      return "The speech service had a hiccup. Try once more.";
    default:
      return "Something went wrong. Try again.";
  }
}

/** Prefer the open ayah; skip Al-Fatiha 1:1 (basmala) when 1:2+ is loaded. */
export function pickCoachVerse(verses: Verse[], vIdx: number): Verse | null {
  const current = verses[vIdx];
  if (!current) return verses[0] || null;
  if (current.key === "1:1") {
    const next = verses.find((verse) => verse.key === "1:2");
    if (next) return next;
  }
  return current;
}

export function coachPayloadForVerse(verse: Verse) {
  const { words, phrases } = expectedFromVerse(verse);
  const match = /^(\d+):(\d+)$/.exec(verse.key);
  const surah = match ? Number(match[1]) : undefined;
  const ayah = match ? Number(match[2]) : undefined;
  return {
    expectedText: words.map((word) => word.ar).filter(Boolean).join(" "),
    expectedWords: words.map((word) => ({
      pos: word.pos,
      ar: word.ar,
      verseKey: word.verseKey,
      audio: word.audio,
    })),
    marks: verse.marks,
    phrases,
    surah,
    ayahStart: ayah,
    ayahEnd: ayah,
    verseKey: verse.key,
    words,
  };
}

/** Fold new miss counts from the ASR response into the session map. */
export function mergeMissCounts(
  prior: Record<string, number>,
  replays: ReplayDecision[],
): Record<string, number> {
  const next = { ...prior };
  for (const replay of replays) {
    if (!replay.targetId || replay.action === "replay_phrase") continue;
    const count =
      typeof replay.missCount === "number" && Number.isFinite(replay.missCount)
        ? Math.max(1, Math.floor(replay.missCount))
        : (next[replay.targetId] || 0) + 1;
    next[replay.targetId] = count;
  }
  return next;
}

export function turnOutcome(response: UstadhAsrResponse): "matched" | "miss" {
  return response.interrupts.length || response.replays.length ? "miss" : "matched";
}

/** Primary replay to act on: first interrupt’s word, else first replay. */
export function primaryReplay(response: UstadhAsrResponse): ReplayDecision | null {
  if (!response.replays.length) return null;
  const interrupt = response.interrupts[0];
  if (interrupt && interrupt.wordIndex != null) {
    const hit = response.replays.find((replay) => replay.wordIndex === interrupt.wordIndex);
    if (hit) return hit;
  }
  return response.replays[0];
}

export function mapClientErrorCode(code: string | undefined, status?: number): UstadhCoachErrorCode {
  if (code === "ASR_NOT_CONFIGURED") return "ASR_NOT_CONFIGURED";
  if (code === "MIC_DENIED" || code === "MIC_UNAVAILABLE" || code === "EMPTY_CLIP") {
    return code;
  }
  if (status === 0 || code === "NETWORK") return "NETWORK";
  if (code === "ASR_UPSTREAM") return "ASR_UPSTREAM";
  return "UNKNOWN";
}
