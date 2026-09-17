/**
 * Client IP for rate limits and Clerk's Frontend API proxy.
 * Cloudflare's CF-Connecting-IP is the edge-seen address. Do not trust the
 * leftmost X-Forwarded-For — a client can set that.
 */
export function clientIpFromHeaders(headers: Headers): string | null {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded) return null;
  const last = forwarded
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1);
  return last || null;
}
