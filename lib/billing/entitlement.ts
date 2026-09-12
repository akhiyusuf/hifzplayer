import { createHmac, timingSafeEqual } from "node:crypto";
import { billingSigningSecret } from "./env";
import type { PlanId, Processor, RegionId } from "./plans";
import { isPlanId, isRegionId } from "./plans";
import { entitlementForUser, isPlusActive, pickBestEntitlement, publicEntitlement } from "./entitlement-bind";

export { entitlementForUser, isPlusActive, pickBestEntitlement, publicEntitlement };
export const PLUS_COOKIE = "hifz_plus";

export type Entitlement = {
  v: 1;
  plus: boolean;
  planId: PlanId;
  regionId: RegionId;
  processor: Processor;
  until: string | null;
  email?: string;
  userId?: string;
  /** Stripe subscription id or Paystack subscription_code, when this is a recurring plan. */
  sub?: string;
  ref: string;
  grantedAt: string;
};

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export function periodEnd(planId: PlanId, from = new Date()): string | null {
  if (planId === "lifetime") return null;
  const d = new Date(from.getTime());
  if (planId === "monthly") d.setUTCDate(d.getUTCDate() + 31);
  else d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString();
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

export function sealEntitlement(ent: Entitlement) {
  const secret = billingSigningSecret();
  if (!secret) throw new Error("No billing signing secret is configured");
  const payload = encode(JSON.stringify(ent));
  return `${payload}.${sign(payload, secret)}`;
}

export function openEntitlement(token: string | undefined | null): Entitlement | null {
  if (!token) return null;
  const secret = billingSigningSecret();
  if (!secret) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!equal(sign(payload, secret), sig)) return null;
  try {
    const raw = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Entitlement;
    if (raw.v !== 1 || !isPlanId(raw.planId) || !isRegionId(raw.regionId)) return null;
    if (raw.processor !== "stripe" && raw.processor !== "paystack") return null;
    return raw;
  } catch {
    return null;
  }
}

export function cookieMaxAge(ent: Entitlement) {
  if (!ent.until) return TEN_YEARS;
  const seconds = Math.floor((Date.parse(ent.until) - Date.now()) / 1000);
  return Math.max(60, seconds);
}

export async function readEntitlement(): Promise<Entitlement | null> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  return openEntitlement(jar.get(PLUS_COOKIE)?.value);
}

export function entitlementCookieOptions(ent: Entitlement) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: cookieMaxAge(ent),
  };
}

export async function writeEntitlement(ent: Entitlement) {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  jar.set(PLUS_COOKIE, sealEntitlement(ent), entitlementCookieOptions(ent));
}

export async function clearEntitlementCookie() {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  jar.set(PLUS_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function attachEntitlementCookie(res: { cookies: { set: (name: string, value: string, opts: ReturnType<typeof entitlementCookieOptions>) => unknown } }, ent: Entitlement) {
  res.cookies.set(PLUS_COOKIE, sealEntitlement(ent), entitlementCookieOptions(ent));
}

export function grantFromPayment(opts: {
  planId: PlanId;
  regionId: RegionId;
  processor: Processor;
  email?: string;
  userId?: string;
  sub?: string;
  ref: string;
  until?: string | null;
  plus?: boolean;
}): Entitlement {
  return {
    v: 1,
    plus: opts.plus !== false,
    planId: opts.planId,
    regionId: opts.regionId,
    processor: opts.processor,
    until: opts.until === undefined ? periodEnd(opts.planId) : opts.until,
    email: opts.email,
    userId: opts.userId,
    ...(opts.sub ? { sub: opts.sub } : {}),
    ref: opts.ref,
    grantedAt: new Date().toISOString(),
  };
}
