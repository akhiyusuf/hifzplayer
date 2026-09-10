import { API, AUDIO_BASE, CACHE_MS, KEYS, TRANSLATION_ID } from "./constants";
import { parseSegments } from "./audio";
import { cachedGet, cachedSet } from "./storage";
import { splitTajweedVerse } from "./tajweed";
import type { Chapter, Recitation, Verse, Word, Mark } from "./types";

class ClientError extends Error {}

async function getJSON(url: string, retries = 3): Promise<any> {
  let last: unknown;
  for (let i = 0; i < retries; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 500 * 2 ** (i - 1)));
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.ok) return await res.json();
      if (res.status >= 400 && res.status < 500) throw new ClientError(`HTTP ${res.status} for ${url}`);
      last = new Error(`HTTP ${res.status} for ${url}`);
    } catch (e) {
      if (e instanceof ClientError) throw e;
      last = e;
    }
  }
  throw last;
}

async function cachedJSON(key: string, url: string, maxAge: number) {
  const hit = cachedGet(key, maxAge);
  if (hit) return hit;
  const data = await getJSON(url);
  cachedSet(key, data);
  return data;
}

export async function fetchChapters(): Promise<Chapter[]> {
  const data = await cachedJSON(KEYS.chapters, `${API}/chapters?language=en`, CACHE_MS);
  return data.chapters || [];
}

export async function fetchRecitations(): Promise<Recitation[]> {
  const data = await cachedJSON(KEYS.recitations, `${API}/resources/recitations?language=en`, CACHE_MS);
  return (data.recitations || []).map((e: any) => ({
    id: e.id,
    name: e.translated_name?.name || e.reciter_name || `Reciter ${e.id}`,
    style: e.style || "",
  }));
}

async function versesByChapter(chapter: number, from: number, to: number, extra: string) {
  const startPage = Math.ceil(from / 50);
  const endPage = Math.ceil(to / 50);
  const pages: number[] = [];
  for (let p = startPage; p <= endPage; p++) pages.push(p);
  const results = await Promise.all(
    pages.map((p) =>
      getJSON(`${API}/verses/by_chapter/${chapter}?page=${p}&per_page=50${extra}`),
    ),
  );
  const verses: any[] = [];
  for (const page of results) {
    for (const v of page.verses || []) {
      if (v.verse_number >= from && v.verse_number <= to) verses.push(v);
    }
  }
  verses.sort((a, b) => a.verse_number - b.verse_number);
  return verses;
}

export async function fetchAudio(reciterId: number, chapter: number, from: number, to: number) {
  const verses = await versesByChapter(chapter, from, to, `&audio=${reciterId}`);
  const out: Record<string, { url: string; rawSegments: unknown }> = {};
  for (const v of verses) {
    if (v.audio?.url) {
      const url = /^https?:/i.test(v.audio.url) ? v.audio.url : AUDIO_BASE + String(v.audio.url).replace(/^\//, "");
      out[v.verse_key] = { url, rawSegments: v.audio.segments || null };
    }
  }
  return out;
}

async function fetchTranslation(chapter: number) {
  const data = await getJSON(`${API}/quran/translations/${TRANSLATION_ID}?chapter_number=${chapter}`);
  const byVerse = new Map<number, string>();
  (data.translations || []).forEach((t: any, i: number) => {
    const text = (t.text || "")
      .replace(/<sup[^>]*>.*?<\/sup>/g, "")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (text) byVerse.set(i + 1, text);
  });
  return {
    byVerse,
    name: data.meta?.translation_name || "Translation",
  };
}

export async function fetchPassage(chapter: number, from: number, to: number) {
  const [raw, translation] = await Promise.all([
    versesByChapter(
      chapter,
      from,
      to,
      "&language=en&words=true&word_fields=text_uthmani,text_uthmani_tajweed&fields=text_uthmani,text_uthmani_tajweed",
    ),
    fetchTranslation(chapter).catch(() => ({ byVerse: new Map<number, string>(), name: "Translation" })),
  ]);
  return {
    verses: raw.map((v: any) => {
      const words: Word[] = [];
      const marks: Mark[] = [];
      for (const w of v.words || []) {
        const kind = w.char_type_name || w.char_type || "word";
        if (kind === "word") {
          words.push({
            pos: w.position,
            ar: w.text_uthmani || w.text || "",
            taj: w.text_uthmani_tajweed || null,
            gloss: w.translation?.text || "",
            tr: w.transliteration?.text || "",
          });
        } else {
          marks.push({
            afterPos: words.length ? words[words.length - 1].pos : 0,
            ar: w.text_uthmani || w.text || "",
            kind,
          });
        }
      }
      if (!words.some((w) => w.taj)) {
        const split = splitTajweedVerse(v.text_uthmani_tajweed || "", words.length);
        if (split) for (let i = 0; i < words.length; i++) words[i].tajHTML = split[i] ?? null;
      }
      return {
        key: v.verse_key,
        number: v.verse_number,
        words,
        marks,
        translation: translation.byVerse.get(v.verse_number) || "",
        audio: null,
      } satisfies Verse;
    }),
    translationName: translation.name,
  };
}

const translitCache = new Map<string, string>();

export async function fetchTransliteration(verseKey: string, pos: number): Promise<string> {
  const k = `${verseKey}:${pos}`;
  if (translitCache.has(k)) return translitCache.get(k)!;
  try {
    const data = await getJSON(`${API}/verses/by_key/${verseKey}?language=en&words=true&word_fields=text_uthmani`);
    const word = (data.verse?.words || [])
      .filter((w: any) => (w.char_type_name || w.char_type || "word") === "word")
      .find((w: any) => w.position === pos);
    const text = word?.transliteration?.text || "";
    translitCache.set(k, text);
    return text;
  } catch {
    translitCache.set(k, "");
    return "";
  }
}

export function attachAudio(
  verses: Verse[],
  audio: Record<string, { url: string; rawSegments: unknown }>,
): Verse[] {
  return verses.map((v) => {
    const a = audio[v.key];
    return {
      ...v,
      audio: a ? { url: a.url, segments: parseSegments(a.rawSegments, v.words.length) } : null,
      _est: null,
      _estDur: undefined,
    };
  });
}
