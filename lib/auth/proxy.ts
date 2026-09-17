/**
 * Clerk Frontend API proxy. Production-only (Clerk development instances
 * cannot proxy). Must be an absolute URL — a relative `/__clerk` on Workers
 * can 500 during SSR.
 */
export const CLERK_PROXY_PATH = "/__clerk";

export function clerkProxyUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_CLERK_PROXY_URL || "").trim();
  if (!raw || raw.startsWith("/")) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

/** True when this request should be served through the same-origin Clerk proxy. */
export function clerkFrontendApiProxyEnabled(url: URL): boolean {
  const proxy = clerkProxyUrl();
  if (!proxy) return false;
  try {
    return new URL(proxy).origin === url.origin;
  } catch {
    return false;
  }
}
