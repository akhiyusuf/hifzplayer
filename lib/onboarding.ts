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

/** First-visit pitch. Sells the free mushaf, not a feature dump or a paywall. */
export const ONBOARDING_POINTS = [
  {
    icon: "play" as const,
    title: "Play follows the words",
    body: "Tap a surah. Each word lights as it is recited. Translation sits above play. Tajweed colours are a tap away.",
  },
  {
    icon: "headphones" as const,
    title: "Listen for the days you already keep",
    body: "Friday Kahf, night verses, morning — occasion lists you can open and look around. Playing a list is Diras Plus. The mushaf is not.",
  },
  {
    icon: "brackets" as const,
    title: "Practise without losing the page",
    body: "Word Reps, Masked, and Relay live on the player when you want them. Look around free. Play is Diras Plus. Reading never goes behind a wall.",
  },
] as const;

export const ONBOARDING_LEAD =
  "The mushaf that keeps up with the reciter. Quran reading stays free.";
