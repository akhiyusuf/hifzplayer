import { FOCUS_JOBS } from "./constants.ts";

/** How long each practice mode stays in the spotlight before the next one. */
export const FOCUS_GUIDE_MS = 2400;

export function nextFocusGuideStep(step: number, count = FOCUS_JOBS.length) {
  if (count <= 0) return 0;
  const current = Math.floor(step);
  if (!Number.isFinite(current) || current < 0) return 0;
  return (current + 1) % count;
}
