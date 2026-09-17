import { NextResponse } from "next/server";
import { clerkTrialUsedAt, markClerkTrialUsed } from "@/lib/auth/plus";
import { grantPlusToAccount, resolveEntitlement, signedInEmail, signedInUserId } from "@/lib/auth/session";
import { logBillingEvent } from "@/lib/billing/analytics";
import { countryFromHeaders } from "@/lib/billing/country";
import { publicEntitlement } from "@/lib/billing/entitlement";
import { badRequest, unauthorized } from "@/lib/billing/http";
import { regionForCountry } from "@/lib/billing/plans";
import {
  grantTrial,
  openTrialUsed,
  sealTrialUsed,
  trialAvailable,
  TRIAL_USED_COOKIE,
  trialUsedCookieOptions,
} from "@/lib/billing/trial";
import { PLUS_NAME } from "@/lib/brand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readTrialUsedCookie() {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  return openTrialUsed(jar.get(TRIAL_USED_COOKIE)?.value);
}

export async function POST(request: Request) {
  const userId = await signedInUserId();
  if (!userId) {
    return unauthorized(`Sign in to start your ${PLUS_NAME} trial`, { code: "SIGN_IN_REQUIRED" });
  }

  const entitlement = await resolveEntitlement();
  const clerkUsed = Boolean(await clerkTrialUsedAt(userId));
  const cookieUsed = Boolean(await readTrialUsedCookie());
  const used = clerkUsed || cookieUsed;

  if (!trialAvailable({ entitlement, trialUsed: used })) {
    if (entitlement) return badRequest(`You already have ${PLUS_NAME}.`);
    return badRequest("This free trial was already used on this account.");
  }

  const regionId = regionForCountry(countryFromHeaders(request.headers));
  const email = (await signedInEmail()) || undefined;
  const ent = grantTrial({ regionId, userId, email });
  await grantPlusToAccount(ent, userId, { setCookie: true, kind: "granted" });

  const usedAt = new Date().toISOString();
  try {
    await markClerkTrialUsed(userId, usedAt);
  } catch {
    logBillingEvent({
      type: "clerk_save_failed",
      processor: "trial",
      planId: "trial",
      regionId,
      hasUserId: true,
      accountId: userId,
      reason: "trial_used_mark_failed",
    });
  }

  const sealed = sealTrialUsed(usedAt);
  const res = NextResponse.json({
    ok: true,
    ...publicEntitlement(ent),
    trialAvailable: false,
  });
  if (sealed) {
    res.cookies.set(TRIAL_USED_COOKIE, sealed, trialUsedCookieOptions());
  }

  logBillingEvent({
    type: "granted",
    ok: true,
    processor: "trial",
    planId: "trial",
    regionId,
    source: "confirm",
    hasUserId: true,
    accountId: userId,
  });

  return res;
}
