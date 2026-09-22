import { accountsConfigured } from "./config.ts";
import { accountPlusState, savePlusToAccount } from "./plus.ts";
import { signedInUserId } from "./otp.ts";
import {
  type Entitlement,
  clearEntitlementCookie,
  entitlementForUser,
  pickBestEntitlement,
  readEntitlement,
  writeEntitlement,
} from "@/lib/billing/entitlement";

export { signedInEmail, signedInUser, signedInUserId, clearSession } from "./otp.ts";

export async function resolveEntitlement(): Promise<Entitlement | null> {
  const accountsOn = accountsConfigured();
  const userId = await signedInUserId();
  const cookie = entitlementForUser(await readEntitlement(), userId, accountsOn);

  if (userId) {
    const state = await accountPlusState(userId);
    if (state.status === "revoked") {
      await clearEntitlementCookie();
      return null;
    }
    if (state.status === "ok") {
      const best = pickBestEntitlement(state.ent, cookie);
      if (best) {
        const bound = { ...best, userId };
        await writeEntitlement(bound);
        return bound;
      }
    }
    if (cookie) {
      const bound = { ...cookie, userId };
      if (!cookie.userId) {
        await writeEntitlement(bound);
        await savePlusToAccount(userId, bound, "granted");
      }
      return bound;
    }
    return null;
  }

  return cookie;
}

export async function grantPlusToAccount(
  ent: Entitlement,
  userId: string | null,
  opts: { setCookie?: boolean; kind?: "granted" | "renewed" | "revoked" } = {},
) {
  const next = userId ? { ...ent, userId } : ent;
  if (opts.setCookie !== false) {
    await writeEntitlement(next);
  }
  if (userId) {
    try {
      await savePlusToAccount(userId, next, opts.kind || (next.plus ? "granted" : "revoked"));
    } catch {
      const { logBillingEvent } = await import("@/lib/billing/analytics");
      logBillingEvent({
        type: "account_save_failed",
        processor: next.processor,
        planId: next.planId,
        regionId: next.regionId,
        hasUserId: true,
        accountId: userId,
      });
    }
  }
  return next;
}
