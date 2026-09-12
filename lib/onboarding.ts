import { KEYS } from "./constants.ts";
import { getStore, setStore } from "./storage.ts";

const SESSIONS = "hifz.sessions";
const DAYS = "hifz.days";

export type OnboardingSnapshot = {
  done: boolean;
  sessionCount: number;
  recentCount: number;
  dayCount: number;
};

export function snapshotOnboarding(): OnboardingSnapshot {
  return {
    done: getStore<boolean>(KEYS.onboarded) === true,
    sessionCount: (getStore<unknown[]>(SESSIONS) || []).length,
    recentCount: (getStore<unknown[]>(KEYS.recents) || []).length,
    dayCount: (getStore<unknown[]>(DAYS) || []).length,
  };
}

/** New visitors on Read. Anyone who has already read, or already dismissed, skips it. */
export function shouldShowOnboarding(snap: OnboardingSnapshot): boolean {
  if (snap.done) return false;
  return snap.sessionCount === 0 && snap.recentCount === 0 && snap.dayCount === 0;
}

/** Existing readers must not see a welcome after an app update. */
export function shouldStampExistingUser(snap: OnboardingSnapshot): boolean {
  return !snap.done && (snap.sessionCount > 0 || snap.recentCount > 0 || snap.dayCount > 0);
}

export function markOnboardingDone() {
  setStore(KEYS.onboarded, true);
}
