import { auth, currentUser } from "@clerk/nextjs/server";
import { unstable_rethrow } from "next/navigation";
import { clerkConfigured } from "@/lib/auth/config";
import { clerkPlusState, savePlusToClerk } from "@/lib/auth/plus";
import {
  type Entitlement,
  clearEntitlementCookie,
  entitlementForUser,
  planSignedInEntitlement,
  readEntitlement,
  writeEntitlement,
} from "@/lib/billing/entitlement";

export async function signedInUserId(): Promise<string | null> {
  if (!clerkConfigured()) return null;
  try {
    const { userId } = await auth();
    return userId;
  } catch (err) {
    unstable_rethrow(err);
    return null;
  }
}

export async function signedInUser() {
  if (!clerkConfigured()) return null;
  try {
    return await currentUser();
  } catch (err) {
    unstable_rethrow(err);
    return null;
  }
}

export async function signedInEmail(): Promise<string | null> {
  if (!clerkConfigured()) return null;
  try {
    const user = await signedInUser();
    return user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() || null;
  } catch (err) {
    unstable_rethrow(err);
    return null;
  }
}

/** pages cannot cookies().set(); swallow that without hiding Next redirects. */
export async function tryMutateCookies(run: () => Promise<void>) {
  try {
    await run();
  } catch (err) {
    unstable_rethrow(err);
  }
}

export async function resolveEntitlement(): Promise<Entitlement | null> {
  const accountsOn = clerkConfigured();
  const userId = await signedInUserId();
  const rawCookie = await readEntitlement();

  if (!userId) {
    return entitlementForUser(rawCookie, userId, accountsOn);
  }

  const state = await clerkPlusState(userId);
  const plan = planSignedInEntitlement(state, rawCookie, userId, accountsOn);
  if (plan.persist === "clear") {
    await tryMutateCookies(() => clearEntitlementCookie());
  }
  if (plan.persist === "write" && plan.ent) {
    await tryMutateCookies(() => writeEntitlement(plan.ent as Entitlement));
  }
  if (plan.saveToClerk && plan.ent) {
    try {
      await savePlusToClerk(userId, plan.ent as Entitlement, "granted");
    } catch {
      /* resolved Plus still applies if Clerk metadata cannot be updated */
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
      await savePlusToClerk(userId, next, opts.kind || (next.plus ? "granted" : "revoked"));
    } catch {
      const { logBillingEvent } = await import("@/lib/billing/analytics");
      logBillingEvent({
        type: "clerk_save_failed",
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
