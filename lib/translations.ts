import { API, CACHE_MS, KEYS, TRANSLATION_ID } from "./constants.ts";
import { cachedGet, cachedSet, getStore } from "./storage.ts";

export type TranslationOption = {
  id: number;
  name: string;
  language: string;
};

function labelOf(item: {
  id: number;
  name?: string;
  language_name?: string;
  translated_name?: { name?: string } | null;
}): TranslationOption {
  return {
    id: item.id,
    name: item.translated_name?.name || item.name || `Translation ${item.id}`,
    language: item.language_name || "",
  };
}

export function currentTranslationId() {
  const stored = getStore<number>(KEYS.translationId);
  return typeof stored === "number" && stored > 0 ? stored : TRANSLATION_ID;
}

export async function fetchTranslations(): Promise<TranslationOption[]> {
  const hit = cachedGet(KEYS.translations, CACHE_MS);
  if (Array.isArray(hit) && hit.length) return hit as TranslationOption[];
  const res = await fetch(`${API}/resources/translations?language=en`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for translations`);
  const data = (await res.json()) as { translations?: Parameters<typeof labelOf>[0][] };
  const list = (data.translations || []).map(labelOf);
  list.sort((a, b) => {
    const ae = a.language.toLowerCase() === "english" ? 0 : 1;
    const be = b.language.toLowerCase() === "english" ? 0 : 1;
    if (ae !== be) return ae - be;
    return a.name.localeCompare(b.name);
  });
  cachedSet(KEYS.translations, list);
  return list;
}
