/** Planned work shown on /roadmap. Add items here — do not date them until they ship. */

export type RoadmapStatus = "next" | "cooking";

export type RoadmapItem = {
  id: string;
  title: string;
  arabic?: string;
  blurb: string;
  detail: string;
  status: RoadmapStatus;
  /** False means it stays off the paywall when it lands. */
  plus: boolean;
  icon: string;
  featured?: boolean;
};

export const ROADMAP_STATUS_LABEL: Record<RoadmapStatus, string> = {
  cooking: "In the works",
  next: "Coming next",
};

export const ROADMAP: RoadmapItem[] = [
  {
    id: "ask",
    title: "Ask the Quran",
    arabic: "اسأل",
    blurb: "Sit with a verse, a surah, or the whole mushaf, and ask.",
    detail:
      "A question box beside the page — not a chatbot that replaces reading. It will answer from the text you have open: what an ayah is saying, where a wording returns, how to hold a passage. It will not give rulings, and it will not speak over the Arabic.",
    status: "cooking",
    plus: false,
    icon: "sparkles",
    featured: true,
  },
  {
    id: "phrases",
    title: "Recurring phrases",
    arabic: "متشابهات",
    blurb: "The same wording comes back. Tap it, and jump to the other places.",
    detail:
      "When a phrase you are reading also lives in another surah, the page will mark it. You stay in the mushaf, hop across, and come back. We parked this so reading stayed simple. It is first in line, and it stays free.",
    status: "next",
    plus: false,
    icon: "layers",
  },
  {
    id: "twins",
    title: "Near-twin words",
    arabic: "متشابه",
    blurb: "Words that look or sound alike, so you do not mix them while you memorise.",
    detail:
      "A quiet mark on a word that has a near twin elsewhere — the kind that trips a hifz session. Open it, see the other one, hear the difference. Also parked so the page stayed clean. Also free when it lands.",
    status: "next",
    plus: false,
    icon: "git-compare",
  },
];

export const ASK_PROMPTS = [
  "What is this ayah saying, in short?",
  "Where else does this wording come back?",
  "Help me hold Ayat al-Kursi",
] as const;

export function featuredRoadmap() {
  return ROADMAP.filter((item) => item.featured);
}

export function listedRoadmap() {
  return ROADMAP.filter((item) => !item.featured);
}
