import { createHmac, timingSafeEqual } from "node:crypto";
import { billingSigningSecret } from "./env.ts";
import { addPlanPeriod, isPlusActive, type PlusFields } from "./entitlement-bind.ts";
import type { Entitlement } from "./entitlement.ts";
import type { RegionId } from "./plans.ts";

export const TRIAL_DAYS = 1;
export const TRIAL_USED_COOKIE = "hifz_trial_used";
export const TRIAL_USED_MAX_AGE = 60 * 60 * 24 * 365 * 10;

export function trialUntil(from = new Date()): string {
  return addPlanPeriod("trial", from)!;
}

export function grantTrial(opts: {
  regionId: RegionId;
  userId?: string;
  email?: string;
  ref?: string;
}): Entitlement {
  const ref = opts.ref || `trial:${opts.userId || "anon"}:${Date.now()}`;
  return {
    v: 1,
    plus: true,
    planId: "trial",
    regionId: opts.regionId,
    processor: "trial",
    until: trialUntil(),
    email: opts.email,
    userId: opts.userId,
    ref,
    grantedAt: new Date().toISOString(),
  };
}

export function trialAvailable(opts: {
  entitlement: PlusFields | null;
  trialUsed: boolean;
}): boolean {
  if (opts.trialUsed) return false;
  if (isPlusActive(opts.entitlement)) return false;
  return true;
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Long-lived marker so a browser cannot restart the trial after it ends. */
export function sealTrialUsed(at = new Date().toISOString()) {
  const secret = billingSigningSecret();
  if (!secret) return null;
  const payload = encode(JSON.stringify({ v: 1 as const, at }));
  return `${payload}.${sign(payload, secret)}`;
}

export function openTrialUsed(token: string | undefined | null): string | null {
  if (!token) return null;
  const secret = billingSigningSecret();
  if (!secret) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!equal(sign(payload, secret), sig)) return null;
  try {
    const raw = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      v?: number;
      at?: string;
    };
    if (raw.v !== 1 || !raw.at || !Number.isFinite(Date.parse(raw.at))) return null;
    return raw.at;
  } catch {
    return null;
  }
}

export function trialUsedCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TRIAL_USED_MAX_AGE,
  };
}
