import { auth, currentUser } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/auth/config";
import { clerkPlusState, savePlusToClerk } from "@/lib/auth/plus";
import {
  type Entitlement,
  entitlementForUser,
  pickBestEntitlement,
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
  const cookie = entitlementForUser(await readEntitlement(), userId, accountsOn);

  if (userId) {
    const state = await clerkPlusState(userId);
    if (state.status === "revoked") return null;
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
        await savePlusToClerk(userId, bound, "granted");
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
