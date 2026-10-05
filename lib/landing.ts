import { APP_NAME, PLUS_NAME } from "./brand.ts";

/** Marketing landing — sells Focus first; free mushaf is the trust line. */

export const LANDING = {
  metaTitle: `${APP_NAME} — Quran reading and memorisation`,
  metaDescription:
    "Diras is a Quran reading and memorisation practice app. Read the mushaf free, then practise with Word Reps, Masked, and Relay.",
  salaam: "Assalamu alaikum",
  brand: APP_NAME,
  headline: "Practise the Quran on the page.",
  lead: "Diras is a Quran reading and memorisation practice app. Word Reps loops a hard word, Masked hides the line, and Relay trades turns with the qari. Try the live floor beside you — no account.",
  purposeTitle: "What Diras is for",
  purposeBody:
    "Diras is a Quran reading and memorisation practice app. You can open the mushaf and read or listen without signing in. Practice on a passage is Word Reps, Masked, and Relay: loop a word, hide the line, or trade ayahs with the qari. An account is optional.",
  googleUserData:
    "Diras may request Sign in with Google so you can create or open an account. When you choose Google sign-in, we request your Google name and verified email (and Google account id) only to create or sign into your Diras account and show your name. We do not use Google user data for ads, sale, profiling, or AI training. We do not access Gmail, Drive, Calendar, Photos, or Contacts.",
  googleApis:
    "Diras does not use Google APIs to create or distribute AI-generated non-consensual intimate imagery; Google sign-in is only for account login.",
  purposeLegalBefore: "Read the",
  purposePrivacyLabel: "privacy policy",
  purposeLegalBetween: "and the",
  purposeTermsLabel: "terms of service",
  purposeLegalAfter:
    "Both pages are public. They describe what Diras collects, including Google user data, and the rules for using the app.",
  primaryCta: "Try Plus free for 1 day",
  primaryHref: "/pricing",
  secondaryCta: "Open the mushaf",
  secondaryHref: "/home",
  demoKicker: "Live Focus · Al-ʿAṣr · no account",
  freeLine: "Reading and word-sync audio stay free. Plus unlocks Word Reps, Masked, Relay, and playlists.",
  focusTitle: "Three jobs. One floor.",
  focusLead: "Same Word Reps, Masked, and Relay as in the app — try them above, then keep going in the mushaf.",
  jobs: [
    {
      id: "word-reps",
      icon: "repeat" as const,
      title: "Word Reps",
      blurb: "Tap a word to loop it. Pin a stretch to drill a phrase with the teaching reciter — 5×, 10×, or until you stop.",
      sample: { kind: "reps" as const },
    },
    {
      id: "masked",
      icon: "eye-off" as const,
      title: "Masked",
      blurb: "Cover the ayah. Peek when you blank. Or play and watch the words return as you listen.",
      sample: { kind: "masked" as const },
    },
    {
      id: "relay",
      icon: "users" as const,
      title: "Relay",
      blurb: "You take an ayah. Then the qari takes the next. Skip when you are done — the chain keeps moving.",
      sample: { kind: "relay" as const },
    },
  ],
  plusTitle: PLUS_NAME,
  plusLead: "Focus unlocked in the app. Listen lists. Deep word repeats. One day free — no card.",
  plusPoints: [
    "Word Reps, Masked, and Relay on every page you open",
    "Occasion listen lists — Friday, night, morning",
    "Word repeats past ×2, and Relay with more than one qari",
  ],
  upcomingTitle: "What’s coming",
  upcomingLead: "The page gets sharper. Plus goes further.",
  upcoming: [
    {
      id: "ask",
      icon: "sparkles" as const,
      title: "Ask the Quran",
      blurb: "Sit with a verse and ask — answers from the text you have open.",
      plus: true,
    },
    {
      id: "voice",
      icon: "mic" as const,
      title: "Voice recognition",
      blurb: "Read aloud; the page checks the recitation as you go.",
      plus: true,
    },
    {
      id: "phrases",
      icon: "layers" as const,
      title: "Recurring phrases",
      blurb: "The same wording returns — tap it and jump to the other places.",
      plus: false,
    },
    {
      id: "twins",
      icon: "git-compare" as const,
      title: "Near-twin words",
      blurb: "Words that look or sound alike, marked so you don’t mix them in hifz.",
      plus: false,
    },
  ],
  closeTitle: "Feel the difference in one day",
  closeLead: `You already tried Focus above. Start the free ${PLUS_NAME} trial to keep that floor in the mushaf — or walk away; reading was always free.`,
  closeCta: "Start free trial",
  closeHref: "/pricing",
} as const;
