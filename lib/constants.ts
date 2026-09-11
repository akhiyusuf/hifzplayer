export const API = "https://api.quran.com/api/v4";
export const AUDIO_BASE = "https://verses.quran.com/";
export const TRANSLATION_ID = 20; // Saheeh International
export const CACHE_MS = 7 * 24 * 60 * 60 * 1000;
export const RATES = [0.75, 1, 1.25, 1.5] as const;
export const ANNOTATION_VERSION = 3;
export const LOOP_COUNTS = [1, 2, 3, 5, 10, 0] as const;

export const MODES = [
  {
    id: "word",
    name: "Drill words",
    icon: "brackets",
    desc: "Pick a span and loop it until it sticks",
  },
  {
    id: "verse",
    name: "Verse",
    icon: "book-open",
    desc: "Play through, or repeat the ayah from the player",
  },
  {
    id: "masked",
    name: "Masked",
    icon: "eye-off",
    desc: "Words stay covered until the reciter reaches them",
  },
  {
    id: "relay",
    name: "Relay",
    icon: "users",
    desc: "You recite a verse, then the qari recites the next",
  },
] as const;

export type ModeId = (typeof MODES)[number]["id"];

export const TAJWEED_LEGEND = [
  { color: "#FF7E1E", label: "Ghunnah" },
  { color: "#9400A8", label: "Ikhfa" },
  { color: "#D500B7", label: "Ikhfa shafawi" },
  { color: "#26BFFD", label: "Iqlab" },
  { color: "#169777", label: "Idgham (ghunnah)" },
  { color: "#169200", label: "Idgham (no ghunnah)" },
  { color: "#58B800", label: "Idgham shafawi" },
  { color: "#DD0008", label: "Qalqalah" },
  { color: "#537FFF", label: "Madd (2)" },
  { color: "#4050FF", label: "Madd (4–5)" },
  { color: "#0018C9", label: "Madd (6)" },
  { color: "#9A958C", label: "Silent / hamzat wasl" },
] as const;

export const KEYS = {
  dark: "hifz.dark",
  style: "hifz.style",
  reciter: "hifz.reciter",
  recents: "hifz.recents",
  taj: "hifz.taj",
  wordRepeat: "hifz.wrep",
  loopCount: "hifz.passes",
  chapters: "hifz.chapters",
  recitations: "hifz.recitations",
  layerPhrases: "hifz.layer.phrases",
  layerConfusables: "hifz.layer.confusables",
  showTranslation: "hifz.trans",
} as const;
