import { clientIpFromHeaders } from "../host/client-ip.ts";
import { turnstileSecretKey } from "./config.ts";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(
  token: string | undefined | null,
  headers: Headers,
): Promise<boolean> {
  const secret = turnstileSecretKey();
  if (!secret) return process.env.NODE_ENV !== "production";
  const value = (token || "").trim();
  if (!value) return false;
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
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
