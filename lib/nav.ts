/** Safe in-app back target. Unknown or external values fall back to the reading hub. */
export function backHref(from: string | string[] | undefined): string {
  const value = Array.isArray(from) ? from[0] : from;
  if (value === "settings") return "/settings";
  if (value === "account") return "/account";
  if (value === "pricing") return "/pricing";
  if (value === "gift") return "/pricing";
  if (value === "listen") return "/listen";
  if (value === "roadmap") return "/roadmap";
  if (value === "home") return "/home";
  return "/home";
}

/** Allow only same-origin relative paths. */
export function safePath(path: string | string[] | undefined, fallback = "/home") {
  const value = Array.isArray(path) ? path[0] : path;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return fallback;
  }
  return value;
}

export type FocusPassageTarget = {
  chapter: number;
  from: number;
  to: number;
};

/** Default Focus entry when the reader has no session yet (Al-Fātiḥah). */
export const FOCUS_FALLBACK: FocusPassageTarget = { chapter: 1, from: 1, to: 7 };

/** Build a /read URL that opens Focus on a passage. */
export function focusPassageHref(
  target: FocusPassageTarget = FOCUS_FALLBACK,
  opts?: { back?: string; mode?: "verse" | "word" | "masked" | "relay" },
) {
  const chapter = Math.max(1, Math.floor(target.chapter) || 1);
  const from = Math.max(1, Math.floor(target.from) || 1);
  const to = Math.max(from, Math.floor(target.to) || from);
  const q = new URLSearchParams();
  q.set("from", String(from));
  q.set("to", String(to));
  q.set("style", "focus");
  if (opts?.mode && opts.mode !== "verse") q.set("mode", opts.mode);
  if (opts?.back) q.set("back", opts.back);
  return `/read/${chapter}?${q.toString()}`;
}

/** True when the read URL is asking for Focus (style or a Focus job). */
export function isFocusReadQuery(search: string) {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const style = q.get("style");
  if (style === "focus") return true;
  const mode = q.get("mode");
  return mode === "word" || mode === "masked" || mode === "relay";
}
