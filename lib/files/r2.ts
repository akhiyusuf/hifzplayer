/**
 * Quran audio and other blobs. Prefer the Workers R2 binding; fall back to a
 * public base URL (custom domain on the bucket) when running on Vercel.
 */
export function r2PublicBaseUrl() {
  return (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
}

export function r2Configured() {
  return Boolean(r2PublicBaseUrl());
}

export function r2ObjectUrl(key: string) {
  const base = r2PublicBaseUrl();
  if (!base || !key) return null;
  return `${base}/${key.replace(/^\/+/, "")}`;
}

export function r2PublicOrigin() {
  const base = r2PublicBaseUrl();
  if (!base) return null;
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}

export async function r2Bucket() {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    return ctx.env.DIRAS_FILES ?? null;
  } catch {
    return null;
  }
}
