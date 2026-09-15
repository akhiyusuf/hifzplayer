import { FOCUS_FALLBACK, focusPassageHref } from "./nav.ts";
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

/** First-surah Focus ritual — Al-Fātiḥah, Word Reps on the page. */
export const RITUAL_SURAH = "Al-Fātiḥah";
export const RITUAL_ARABIC = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

/** Opens Al-Fātiḥah in Focus with Word Reps — the first practise beat. */
export function ritualFocusHref() {
  return focusPassageHref(FOCUS_FALLBACK, { mode: "word", back: "home" });
}

/**
 * First-visit pitch. Sells the Focus ritual on Al-Fātiḥah, not a feature dump or a paywall.
 * Reading stays free; Focus play may ask for Plus later.
 */
export const ONBOARDING_LEAD =
  "Start on Al-Fātiḥah in Focus. Tap a word, hide a line, trade a turn — practise stays on the page. Reading stays free.";

export const ONBOARDING_POINTS = [
  {
    icon: "brackets" as const,
    title: "Word Reps on the ayah",
    body: "Open Al-Fātiḥah. Tap a hard word and loop it — 5×, 10×, or until it sticks.",
  },
  {
    icon: "eye-off" as const,
    title: "Masked when you are ready",
    body: "Cover the line. Peek if you blank. Reveal as you listen — still on the same page.",
  },
  {
    icon: "users" as const,
    title: "Relay with the qari",
    body: "You take a stretch. Then the teaching reciter takes the next. Skip when you are done.",
  },
] as const;

export const ONBOARDING_PRIMARY_CTA = "Open Al-Fātiḥah in Focus";
export const ONBOARDING_SECONDARY_CTA = "Browse the mushaf first";
