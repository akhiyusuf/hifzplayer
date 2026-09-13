import { AUDIO_BASE } from "./constants.ts";

export function resolveAudioUrl(raw: unknown, base = AUDIO_BASE): string | null {
  const url = String(raw ?? "").trim();
  if (!url) return null;
  if (url.startsWith("//")) return `https:${url}`;
  if (/^https?:/i.test(url)) return url;
  return base + url.replace(/^\//, "");
}
