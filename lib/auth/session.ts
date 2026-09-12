import { auth, currentUser } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/auth/config";
import { clerkPlusRevoked, plusFromClerk, savePlusToClerk } from "@/lib/auth/plus";
import {
  type Entitlement,
  clearEntitlementCookie,
  entitlementForUser,
  readEntitlement,
  writeEntitlement,
} from "@/lib/billing/entitlement";

export async function signedInUserId(): Promise<string | null> {
  if (!clerkConfigured()) return null;
  try {
    const { userId } = await auth();
    return userId;
  } catch {
    return null;
  }
}

export async function signedInEmail(): Promise<string | null> {
  if (!clerkConfigured()) return null;
  try {
    const user = await currentUser();
    return user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

export async function resolveEntitlement(): Promise<Entitlement | null> {
  const accountsOn = clerkConfigured();
  const userId = await signedInUserId();
  if (userId && (await clerkPlusRevoked(userId))) {
    await clearEntitlementCookie();
    return null;
  }
  const fromCookie = entitlementForUser(await readEntitlement(), userId, accountsOn);
  if (fromCookie) {
    if (accountsOn && userId && !fromCookie.userId) {
      const bound = { ...fromCookie, userId };
      await writeEntitlement(bound);
      await savePlusToClerk(userId, bound);
      return bound;
    }
    return fromCookie;
  }
  if (userId) {
    const stored = await plusFromClerk(userId);
    if (stored) {
      await writeEntitlement(stored);
      return stored;
    }
  }
  return null;
}

export async function grantPlusToAccount(
  ent: Entitlement,
  userId: string | null,
  opts: { setCookie?: boolean } = {},
) {
  const next = userId ? { ...ent, userId } : ent;
  if (opts.setCookie !== false) {
    await writeEntitlement(next);
  }
  if (userId) {
    try {
      await savePlusToClerk(userId, next);
    } catch {
      const { logBillingEvent } = await import("@/lib/billing/analytics");
      logBillingEvent({
        type: "clerk_save_failed",
        processor: next.processor,
        planId: next.planId,
        regionId: next.regionId,
        hasUserId: true,
      });
    }
  }
  return next;
}
