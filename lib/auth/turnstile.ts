import { clientIpFromHeaders } from "../host/client-ip.ts";
import { turnstileSecretKey } from "./config.ts";
import { isTurnstileAction, type TurnstileAction } from "./turnstile-actions.ts";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TOKEN_MAX = 2048;
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);

export type SiteverifyResult = {
  success?: boolean;
  action?: string;
  hostname?: string;
};

/**
 * Hostnames siteverify is allowed to return.
 * Production defaults to diras.app and never accepts localhost or 127.0.0.1.
 * Development defaults to those local hosts so the existing Diras widget
 * (domains: diras.app, localhost) can be tested on http://localhost:3000.
 */
export function turnstileExpectedHostnames(): Set<string> {
  const configured = (process.env.TURNSTILE_HOSTNAMES ?? "")
    .split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);
  const production = process.env.NODE_ENV === "production";
  const hosts = configured.length > 0 ? configured : production ? ["diras.app"] : ["localhost", "127.0.0.1"];
  return new Set(production ? hosts.filter((hostname) => !LOCAL_HOSTNAMES.has(hostname)) : hosts);
}

/**
 * Development-only escape hatch: skip siteverify when no Worker secret is set.
 * Production always fails closed.
 */
export function turnstileDevBypass(): boolean {
  return process.env.NODE_ENV !== "production" && !turnstileSecretKey();
}

/**
 * Redeem a Turnstile token once. Requires success, the surface action, and an
 * allowed hostname. A replayed token fails at siteverify (timeout-or-duplicate).
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  headers: Headers,
  expectedAction: TurnstileAction,
): Promise<boolean> {
  if (!isTurnstileAction(expectedAction)) return false;
  if (turnstileDevBypass()) return true;
  if (!turnstileSecretKey()) return false;

  if (typeof token !== "string") return false;
  const value = token.trim();
  if (!value || value.length > TOKEN_MAX) return false;

  const expectedHostnames = turnstileExpectedHostnames();
  if (expectedHostnames.size === 0) return false;

  const secret = turnstileSecretKey();
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", value);
  const ip = clientIpFromHeaders(headers);
  if (ip) body.set("remoteip", ip);

  let result: SiteverifyResult;
  try {
    const res = await fetch(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return false;
    result = (await res.json()) as SiteverifyResult;
  } catch {
    return false;
  }

  const hostname = typeof result.hostname === "string" ? result.hostname.trim().toLowerCase() : "";
  return result.success === true && result.action === expectedAction && expectedHostnames.has(hostname);
}
