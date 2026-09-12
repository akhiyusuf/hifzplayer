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
  sub?: string;
  grantedAt?: string;
  welcomeSentFor?: string;
};

type StoredBillingEvent = {
  at: string;
  type: "granted" | "renewed" | "revoked";
  planId: PlanId;
  regionId: RegionId;
  processor: Processor;
};

const EVENT_CAP = 20;

type ClerkPrivate = {
  hifzPlus?: StoredPlus;
  hifzPlusEvents?: StoredBillingEvent[];
};

export type ClerkPlusState =
  | { status: "none" }
  | { status: "revoked" }
  | { status: "ok"; ent: Entitlement };

export type PlusSaveKind = "granted" | "renewed" | "revoked";

async function clerkUser(userId: string) {
  const client = await clerkClient();
  return client.users.getUser(userId);
}

function storedToEntitlement(userId: string, raw: StoredPlus): Entitlement | null {
  if (!raw.planId || !raw.regionId || !raw.processor || !raw.ref) return null;
  if (!isPlanId(raw.planId) || !isRegionId(raw.regionId)) return null;
  if (raw.processor !== "stripe" && raw.processor !== "paystack") return null;
  const ent = grantFromPayment({
    planId: raw.planId,
    regionId: raw.regionId,
    processor: raw.processor,
    ref: raw.ref,
    until: raw.until,
    plus: raw.plus !== false,
    sub: raw.sub,
  });
  ent.userId = userId;
  if (raw.grantedAt) ent.grantedAt = raw.grantedAt;
  return ent;
}

export async function clerkPlusState(userId: string): Promise<ClerkPlusState> {
  if (!clerkConfigured()) return { status: "none" };
  try {
    const user = await clerkUser(userId);
    const raw = (user.privateMetadata as ClerkPrivate | undefined)?.hifzPlus;
    if (!raw) return { status: "none" };
    if (raw.plus === false) return { status: "revoked" };
    const ent = storedToEntitlement(userId, raw);
    if (!ent) return { status: "none" };
    if (!isPlusActive(ent)) return { status: "none" };
    return { status: "ok", ent };
  } catch {
    return { status: "none" };
  }
}

export async function savePlusToClerk(userId: string, ent: Entitlement, kind: PlusSaveKind = "granted") {
  if (!clerkConfigured()) return;
  const client = await clerkClient();
  let events: StoredBillingEvent[] = [];
  let welcomeSentFor: string | undefined;
  let previousSub: string | undefined;
  try {
    const user = await clerkUser(userId);
    const meta = user.privateMetadata as ClerkPrivate | undefined;
    if (Array.isArray(meta?.hifzPlusEvents)) events = meta.hifzPlusEvents;
    welcomeSentFor = meta?.hifzPlus?.welcomeSentFor;
    previousSub = meta?.hifzPlus?.sub;
  } catch {
    events = [];
  }
  const eventKind: StoredBillingEvent["type"] = ent.plus === false ? "revoked" : kind;
  events = [
    ...events,
    {
      at: ent.grantedAt,
      type: eventKind,
      planId: ent.planId,
      regionId: ent.regionId,
      processor: ent.processor,
    },
  ].slice(-EVENT_CAP);

  await client.users.updateUserMetadata(userId, {
    privateMetadata: {
      hifzPlus: {
        plus: ent.plus,
        planId: ent.planId,
        regionId: ent.regionId,
        processor: ent.processor,
        until: ent.until,
        ref: ent.ref,
        sub: ent.sub || previousSub,
        grantedAt: ent.grantedAt,
        ...(welcomeSentFor ? { welcomeSentFor } : {}),
      } satisfies StoredPlus,
      hifzPlusEvents: events,
    },
  });
}

export async function plusFromClerk(userId: string): Promise<Entitlement | null> {
  const state = await clerkPlusState(userId);
  return state.status === "ok" ? state.ent : null;
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

/** Resolve a Clerk user id from a receipt email. Never log the email. */
export async function clerkUserIdByEmail(email: string): Promise<string | null> {
  if (!clerkConfigured()) return null;
  const address = email.trim().toLowerCase();
  if (!address) return null;
  try {
    const client = await clerkClient();
    const { data } = await client.users.getUserList({ emailAddress: [address], limit: 2 });
    if (data.length === 1) return data[0]?.id || null;
    return null;
  } catch {
    return null;
  }
}

export async function plusWelcomeAlreadySent(userId: string, _ref?: string): Promise<boolean> {
  if (!clerkConfigured()) return false;
  try {
    const user = await clerkUser(userId);
    return Boolean((user.privateMetadata as ClerkPrivate | undefined)?.hifzPlus?.welcomeSentFor);
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
