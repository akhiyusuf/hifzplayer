/** Safe in-app back target. Unknown or external values fall back to home. */
export function backHref(from: string | string[] | undefined): string {
  const value = Array.isArray(from) ? from[0] : from;
  if (value === "settings") return "/settings";
  if (value === "account") return "/account";
  if (value === "pricing") return "/pricing";
  if (value === "listen") return "/listen";
  return "/";
}

/** Allow only same-origin relative paths. */
export function safePath(path: string | string[] | undefined, fallback = "/") {
  const value = Array.isArray(path) ? path[0] : path;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://")) return fallback;
  return value;
}

