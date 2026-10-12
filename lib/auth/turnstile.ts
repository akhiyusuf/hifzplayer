import { clientIpFromHeaders } from "../host/client-ip.ts";
import { turnstileSecretKey } from "./config.ts";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verify a Turnstile token via Siteverify.
 * When no secret is configured, skip verification so sign-in still works
 * (operator must add TURNSTILE_SECRET_KEY / TURNSTILE_SECRET for bot checks).
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  headers: Headers,
): Promise<boolean> {
  const secret = turnstileSecretKey();
  if (!secret) return true;
  const value = (token || "").trim();
  if (!value || value.length > 2048) return false;
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", value);
  const ip = clientIpFromHeaders(headers);
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
