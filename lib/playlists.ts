/** Curated listen lists. Copy is "often listened for", not medical or miracle claims. */

export type PlaylistStop = {
  chapter: number;
  from: number;
  to: number;
};

export type Playlist = {
  id: string;
  title: string;
  arabic: string;
  blurb: string;
  stops: PlaylistStop[];
};

export const BEST_OF_ID = "best";

/** Loved passages played in whichever reciter the listener picked. Same ayahs for every qari. */
export const BEST_OF_STOPS: PlaylistStop[] = [
  { chapter: 1, from: 1, to: 7 },
  { chapter: 2, from: 255, to: 255 },
  { chapter: 2, from: 285, to: 286 },
  { chapter: 18, from: 1, to: 10 },
  { chapter: 36, from: 1, to: 12 },
  { chapter: 55, from: 1, to: 13 },
  { chapter: 67, from: 1, to: 12 },
  { chapter: 112, from: 1, to: 4 },
  { chapter: 113, from: 1, to: 5 },
  { chapter: 114, from: 1, to: 6 },
];

export const OCCASION_PLAYLISTS: Playlist[] = [
  {
    id: "friday",
    title: "Friday",
    arabic: "الكهف",
    blurb: "Al-Kahf, often listened on Jumuʿah.",
    stops: [{ chapter: 18, from: 1, to: 110 }],
  },
  {
    id: "sleep",
    title: "Before sleep",
    arabic: "الملك",
    blurb: "Al-Mulk, then As-Sajdah — a nightly listen many keep.",
    stops: [
      { chapter: 67, from: 1, to: 30 },
      { chapter: 32, from: 1, to: 30 },
    ],
  },
  {
    id: "night",
    title: "Night verses",
    arabic: "آية الكرسي",
    blurb: "Ayat al-Kursi, the last two of Al-Baqarah, then the three Quls.",
    stops: [
      { chapter: 2, from: 255, to: 255 },
      { chapter: 2, from: 285, to: 286 },
      { chapter: 112, from: 1, to: 4 },
      { chapter: 113, from: 1, to: 5 },
      { chapter: 114, from: 1, to: 6 },
    ],
  },
  {
    id: "morning",
    title: "Morning",
    arabic: "الواقعة",
    blurb: "Al-Waqiʿah, often put on in the morning.",
    stops: [{ chapter: 56, from: 1, to: 96 }],
  },
  {
    id: "yasin",
    title: "Yasin",
    arabic: "يس",
    blurb: "Widely listened in hardship and at gatherings.",
    stops: [{ chapter: 36, from: 1, to: 83 }],
  },
  {
    id: "rahman",
    title: "Ar-Rahman",
    arabic: "الرحمن",
    blurb: "A favourite surah to sit with.",
    stops: [{ chapter: 55, from: 1, to: 78 }],
  },
  {
    id: "ease",
    title: "Ease",
    arabic: "الشرح",
    blurb: "Ad-Duha and Ash-Sharh, then Al-Fatihah — short surahs people play when they need ease.",
    stops: [
      { chapter: 93, from: 1, to: 11 },
      { chapter: 94, from: 1, to: 8 },
      { chapter: 1, from: 1, to: 7 },
    ],
  },
  {
    id: "unwell",
    title: "When unwell",
    arabic: "الفاتحة",
    blurb: "Al-Fatihah, Ayat al-Kursi, and the three Quls — as listening, not as treatment.",
    stops: [
      { chapter: 1, from: 1, to: 7 },
      { chapter: 2, from: 255, to: 255 },
      { chapter: 112, from: 1, to: 4 },
      { chapter: 113, from: 1, to: 5 },
      { chapter: 114, from: 1, to: 6 },
    ],
  },
];

/** Reciters people tap first. Ids from Quran.com /resources/recitations. */
export const FEATURED_RECITER_IDS = [9, 8, 6, 7, 2, 1, 3, 4];

export function reciterDisplayName(name: string, style?: string | null) {
  const trimmed = (name || "").trim() || "this reciter";
  const st = (style || "").trim();
  return st ? `${trimmed} · ${st}` : trimmed;
}

export function bestOfPlaylist(reciterName: string, style?: string | null): Playlist {
  const shown = reciterDisplayName(reciterName, style);
  return {
    id: BEST_OF_ID,
    title: `Best of ${shown}`,
    arabic: "",
    blurb: "Loved passages in this recitation — the same ayahs, this voice.",
    stops: BEST_OF_STOPS,
  };
}

export function resolvePlaylist(
  id: string | null | undefined,
  reciterName = "this reciter",
  reciterStyle?: string | null,
): Playlist | null {
  if (!id) return null;
  if (id === BEST_OF_ID) return bestOfPlaylist(reciterName, reciterStyle);
  return OCCASION_PLAYLISTS.find((p) => p.id === id) ?? null;
}

export function clampStopIndex(list: Playlist, index: number) {
  if (!list.stops.length) return 0;
  if (!Number.isFinite(index) || index < 0) return 0;
  return Math.min(Math.floor(index), list.stops.length - 1);
}

export function playlistHref(opts: {
  listId: string;
  reciterId: number | null | undefined;
  stop?: number;
  play?: boolean;
}): string | null {
  const list = resolvePlaylist(opts.listId);
  if (!list) return null;
  const stop = list.stops[clampStopIndex(list, opts.stop ?? 0)];
  if (!stop) return null;
  const q = new URLSearchParams({
    from: String(stop.from),
    to: String(stop.to),
    list: opts.listId,
    stop: String(clampStopIndex(list, opts.stop ?? 0)),
    back: "listen",
  });
  if (opts.reciterId != null && opts.reciterId > 0) q.set("reciter", String(opts.reciterId));
  if (opts.play) q.set("play", "1");
  return `/read/${stop.chapter}?${q.toString()}`;
}

export function stopLabel(
  stop: PlaylistStop,
  chapters: { id: number; name_simple: string }[],
) {
  const name = chapters.find((c) => c.id === stop.chapter)?.name_simple || `Surah ${stop.chapter}`;
  if (stop.from === stop.to) return `${name} ${stop.from}`;
  return `${name} ${stop.from}–${stop.to}`;
}

export function sortRecitersForBestOf<T extends { id: number }>(list: T[]): T[] {
  const rank = new Map(FEATURED_RECITER_IDS.map((id, i) => [id, i]));
  return [...list].sort((a, b) => {
    const ar = rank.get(a.id) ?? 1000 + a.id;
    const br = rank.get(b.id) ?? 1000 + b.id;
    return ar - br;
  });
}
