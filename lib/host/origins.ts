/** Parse a URL or origin into a canonical origin (scheme + host + port). */
export function originOf(value: string | undefined | null): string | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  try {
    const url = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function splitList(value: string | undefined | null): string[] {
  return (value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
