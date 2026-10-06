import type { UstadhCoachErrorCode } from "./coach.ts";

/**
 * Continuous coach loop: after Ustadh replays (or after a match) the mic opens
 * again on its own. The learner taps Listen once to start and Stop to pause.
 */
export const USTADH_LOOP = {
  /** Beat after a replay clip ends before the mic reopens (lets the room go quiet). */
  afterReplayMs: 350,
  /** Beat after a clean take so "Matched" is visible before the next take. */
  afterMatchMs: 1_200,
  /** Beat after a miss that had nothing to replay. */
  afterMissMs: 900,
  /** Beat after a take with no speech before trying once more. */
  afterSilentMs: 600,
  /** Consecutive takes with no speech before the loop pauses itself. */
  maxSilentTakes: 2,
} as const;

export type CoachLoopState = {
  /** Loop is running (mic reopens automatically). */
  auto: boolean;
  /** Consecutive takes with no usable speech. */
  silentStreak: number;
};

export type CoachLoopEvent =
  | { type: "start" }
  | { type: "stop" }
  | { type: "matched" }
  | { type: "miss"; replayed: boolean }
  | { type: "silent" }
  | { type: "error"; code: UstadhCoachErrorCode };

export type CoachLoopNext =
  | { kind: "listen"; delayMs: number }
  | { kind: "idle"; reason: "stopped" | "silent" | "error" | "manual" };

export type CoachLoopStep = { state: CoachLoopState; next: CoachLoopNext };

export const INITIAL_COACH_LOOP: CoachLoopState = { auto: false, silentStreak: 0 };

/** Pure transition for the auto-listen loop (unit-tested; the coach bar runs the effects). */
export function coachLoopStep(
  state: CoachLoopState,
  event: CoachLoopEvent,
  config = USTADH_LOOP,
): CoachLoopStep {
  switch (event.type) {
    case "start":
      return { state: { auto: true, silentStreak: 0 }, next: { kind: "listen", delayMs: 0 } };
    case "stop":
      return { state: { auto: false, silentStreak: 0 }, next: { kind: "idle", reason: "stopped" } };
    case "matched": {
      const next: CoachLoopState = { ...state, silentStreak: 0 };
      return state.auto
        ? { state: next, next: { kind: "listen", delayMs: config.afterMatchMs } }
        : { state: next, next: { kind: "idle", reason: "manual" } };
    }
    case "miss": {
      const next: CoachLoopState = { ...state, silentStreak: 0 };
      const delayMs = event.replayed ? config.afterReplayMs : config.afterMissMs;
      return state.auto
        ? { state: next, next: { kind: "listen", delayMs } }
        : { state: next, next: { kind: "idle", reason: "manual" } };
    }
    case "silent": {
      const silentStreak = state.silentStreak + 1;
      if (!state.auto) {
        return { state: { ...state, silentStreak }, next: { kind: "idle", reason: "manual" } };
      }
      if (silentStreak >= config.maxSilentTakes) {
        return { state: { auto: false, silentStreak: 0 }, next: { kind: "idle", reason: "silent" } };
      }
      return { state: { ...state, silentStreak }, next: { kind: "listen", delayMs: config.afterSilentMs } };
    }
    case "error": {
      // A take that caught no audio is a silent take; anything else pauses the loop
      // so a broken mic or service is never retried in a tight loop.
      if (event.code === "EMPTY_CLIP") return coachLoopStep(state, { type: "silent" }, config);
      return { state: { auto: false, silentStreak: 0 }, next: { kind: "idle", reason: "error" } };
    }
    default:
      return { state, next: { kind: "idle", reason: "manual" } };
  }
}
