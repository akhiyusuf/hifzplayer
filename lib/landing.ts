import { APP_NAME, PLUS_NAME } from "./brand.ts";

/** Marketing landing — sells Focus first; free mushaf is the trust line. */

export const LANDING = {
  metaTitle: `${APP_NAME} — practise on the page`,
  metaDescription:
    "Diras Focus turns the mushaf into Word Reps, Masked, and Relay. Reading stays free. Try Plus for one day.",
  salaam: "Assalamu alaikum",
  brand: APP_NAME,
  headline: "Practise on the page — not another reader.",
  lead: "Other apps play the mushaf. Diras Focus makes you work the words: repeat them, hide them, pass the mic. Reading stays free.",
  primaryCta: "Try Focus free for 1 day",
  primaryHref: "/pricing",
  secondaryCta: "Open the mushaf",
  secondaryHref: "/home",
  stageEyebrow: "Focus",
  stageCaption: "Word Reps · Masked · Relay — on the same ayah",
  freeLine: "Quran reading, word-sync audio, and verse Repeat stay free either way.",
  focusTitle: "This is what makes Diras different",
  focusLead: "Three jobs. One page. The reason people stay.",
  jobs: [
    {
      id: "word-reps",
      icon: "repeat" as const,
      title: "Word Reps",
      blurb: "Pin a word. Hear it 3×, 5×, 10×, or until you stop. Build the hard ones until they stick.",
      sample: { kind: "reps" as const },
    },
    {
      id: "masked",
      icon: "eye-off" as const,
      title: "Masked",
      blurb: "Hide the words. Reveal only what you need. Test memory without leaving the ayah.",
      sample: { kind: "masked" as const },
    },
    {
      id: "relay",
      icon: "users" as const,
      title: "Relay",
      blurb: "Your turn, then the qari. Or two voices trading the line. Practise like a circle, on the page.",
      sample: { kind: "relay" as const },
    },
  ],
  plusTitle: PLUS_NAME,
  plusLead: "Focus unlocked. Listen lists. Deep word repeats. One day free — no card.",
  plusPoints: [
    "Play Word Reps, Masked, and Relay for real",
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
  closeLead: `Start the free ${PLUS_NAME} trial. Open Focus. If it doesn’t change how you practise, walk away — reading was always free.`,
  closeCta: "Start free trial",
  closeHref: "/pricing",
} as const;
