import { NextResponse } from "next/server";
import { accountsConfigured } from "@/lib/auth/config";
import { trialUsedAt, markTrialUsed } from "@/lib/auth/plus";
import { grantPlusToAccount, resolveEntitlement, signedInEmail, signedInUserId } from "@/lib/auth/session";
import { logBillingEvent } from "@/lib/billing/analytics";
import { countryFromHeaders } from "@/lib/billing/country";
import { publicEntitlement } from "@/lib/billing/entitlement";
import { badRequest, json, unauthorized } from "@/lib/billing/http";
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
  const accountsOn = accountsConfigured();
  const userId = accountsOn ? await signedInUserId() : null;
  if (accountsOn && !userId) {
    return unauthorized(`Sign in to start your ${PLUS_NAME} trial`, { code: "SIGN_IN_REQUIRED" });
  }

  const entitlement = await resolveEntitlement();
  const accountUsed = userId ? Boolean(await trialUsedAt(userId)) : false;
  const cookieUsed = Boolean(await readTrialUsedCookie());
  const used = accountUsed || cookieUsed;

  if (!trialAvailable({ entitlement, trialUsed: used })) {
    if (entitlement) return badRequest(`You already have ${PLUS_NAME}.`);
    return badRequest("This free trial was already used on this account.");
  }

  const regionId = regionForCountry(countryFromHeaders(request.headers));
  const email = userId ? (await signedInEmail()) || undefined : undefined;
  const ent = grantTrial({ regionId, userId: userId || undefined, email });
  await grantPlusToAccount(ent, userId, { setCookie: true, kind: "granted" });

  const usedAt = new Date().toISOString();
  if (userId) {
    try {
      await markTrialUsed(userId, usedAt);
    } catch {
      logBillingEvent({
        type: "account_save_failed",
        processor: "trial",
        planId: "trial",
        regionId,
        hasUserId: true,
        accountId: userId,
        reason: "trial_used_mark_failed",
      });
    }
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
    hasUserId: Boolean(userId),
    accountId: userId || undefined,
  });

  return res;
}
