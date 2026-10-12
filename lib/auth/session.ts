import { unstable_rethrow } from "next/navigation";
import { accountsConfigured } from "./config.ts";
import { accountPlusState, savePlusToAccount } from "./plus.ts";
import { signedInUserId } from "./otp.ts";
import {
  type Entitlement,
  clearEntitlementCookie,
  entitlementForUser,
  planSignedInEntitlement,
  readEntitlement,
  writeEntitlement,
} from "@/lib/billing/entitlement";

export { signedInEmail, signedInUser, signedInUserId, clearSession } from "./otp.ts";

/**
 * Pages cannot call cookies().set() during RSC render — Next throws and the
 * error boundary becomes "Something went wrong". Swallow cookie mutations on
 * pages without hiding redirect()/notFound().
 */
export async function tryMutateCookies(run: () => Promise<void>) {
  try {
    await run();
  } catch (err) {
    unstable_rethrow(err);
  }
}

export async function resolveEntitlement(): Promise<Entitlement | null> {
  const accountsOn = accountsConfigured();
  const userId = await signedInUserId();
  const rawCookie = await readEntitlement();

  if (!userId) {
    return entitlementForUser(rawCookie, userId, accountsOn);
  }

  const state = await accountPlusState(userId);
  const plan = planSignedInEntitlement(state, rawCookie, userId, accountsOn);
  if (plan.persist === "clear") {
    await tryMutateCookies(() => clearEntitlementCookie());
  }
  if (plan.persist === "write" && plan.ent) {
    await tryMutateCookies(() => writeEntitlement(plan.ent as Entitlement));
  }
  if (plan.saveToClerk && plan.ent) {
    try {
      await savePlusToAccount(userId, plan.ent as Entitlement, "granted");
    } catch {
      /* resolved Plus still applies if the account row cannot be updated */
    }
  }
  return plan.ent as Entitlement | null;
}

/** Same as resolveEntitlement, but a page render never becomes the error screen. */
export async function resolveEntitlementSafe(): Promise<Entitlement | null> {
  try {
    return await resolveEntitlement();
  } catch (err) {
    unstable_rethrow(err);
    return null;
  }
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
