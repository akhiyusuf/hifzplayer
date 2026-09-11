import { clerkClient } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/auth/config";
import {
  type Entitlement,
  grantFromPayment,
  isPlusActive,
} from "@/lib/billing/entitlement";
import type { PlanId, Processor, RegionId } from "@/lib/billing/plans";
import { isPlanId, isRegionId } from "@/lib/billing/plans";

type StoredPlus = {
  plus?: boolean;
  planId?: PlanId;
  regionId?: RegionId;
  processor?: Processor;
  until?: string | null;
  ref?: string;
  grantedAt?: string;
  welcomeSentFor?: string;
};

type StoredBillingEvent = {
  at: string;
  type: "granted";
  planId: PlanId;
  regionId: RegionId;
  processor: Processor;
};

const EVENT_CAP = 20;

type ClerkPrivate = {
  hifzPlus?: StoredPlus;
  hifzPlusEvents?: StoredBillingEvent[];
};

async function clerkUser(userId: string) {
  const client = await clerkClient();
  return client.users.getUser(userId);
}

export async function savePlusToClerk(userId: string, ent: Entitlement) {
  if (!clerkConfigured()) return;
  const client = await clerkClient();
  let events: StoredBillingEvent[] = [];
  let welcomeSentFor: string | undefined;
  try {
    const user = await clerkUser(userId);
    const meta = user.privateMetadata as ClerkPrivate | undefined;
    if (Array.isArray(meta?.hifzPlusEvents)) events = meta.hifzPlusEvents;
    welcomeSentFor = meta?.hifzPlus?.welcomeSentFor;
  } catch {
    events = [];
  }
  events = [
    ...events,
    {
      at: ent.grantedAt,
      type: "granted" as const,
      planId: ent.planId,
      regionId: ent.regionId,
      processor: ent.processor,
    },
  ].slice(-EVENT_CAP);

  await client.users.updateUserMetadata(userId, {
    privateMetadata: {
      hifzPlus: {
        plus: true,
        planId: ent.planId,
        regionId: ent.regionId,
        processor: ent.processor,
        until: ent.until,
        ref: ent.ref,
        grantedAt: ent.grantedAt,
        ...(welcomeSentFor ? { welcomeSentFor } : {}),
      } satisfies StoredPlus,
      hifzPlusEvents: events,
    },
  });
}

export async function plusFromClerk(userId: string): Promise<Entitlement | null> {
  if (!clerkConfigured()) return null;
  try {
    const user = await clerkUser(userId);
    const raw = (user.privateMetadata as ClerkPrivate | undefined)?.hifzPlus;
    if (!raw?.plus || !raw.planId || !raw.regionId || !raw.processor || !raw.ref) return null;
    if (!isPlanId(raw.planId) || !isRegionId(raw.regionId)) return null;
    if (raw.processor !== "stripe" && raw.processor !== "paystack") return null;
    const ent = grantFromPayment({
      planId: raw.planId,
      regionId: raw.regionId,
      processor: raw.processor,
      ref: raw.ref,
      until: raw.until,
    });
    ent.userId = userId;
    if (raw.grantedAt) ent.grantedAt = raw.grantedAt;
    return isPlusActive(ent) ? ent : null;
  } catch {
    return null;
  }
}

export async function clerkEmailForUser(userId: string): Promise<string | null> {
  if (!clerkConfigured()) return null;
  try {
    const user = await clerkUser(userId);
    return user.primaryEmailAddress?.emailAddress?.trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

export async function plusWelcomeAlreadySent(userId: string, ref: string): Promise<boolean> {
  if (!clerkConfigured() || !ref) return false;
  try {
    const user = await clerkUser(userId);
    const sent = (user.privateMetadata as ClerkPrivate | undefined)?.hifzPlus?.welcomeSentFor;
    return sent === ref;
  } catch {
    return false;
  }
}

export async function markPlusWelcomeSent(userId: string, ref: string) {
  if (!clerkConfigured() || !ref) return;
  const client = await clerkClient();
  let stored: StoredPlus = { plus: true, ref, welcomeSentFor: ref };
  try {
    const user = await clerkUser(userId);
    stored = { ...(user.privateMetadata as ClerkPrivate | undefined)?.hifzPlus, welcomeSentFor: ref };
  } catch {
    /* keep the stub and still record the send */
  }
  await client.users.updateUserMetadata(userId, {
    privateMetadata: {
      hifzPlus: { ...stored, welcomeSentFor: ref } satisfies StoredPlus,
    },
  });
}
