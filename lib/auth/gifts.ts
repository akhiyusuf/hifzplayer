import { clerkClient } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/auth/config";
import { clerkUserIdByEmail, savePlusToClerk } from "@/lib/auth/plus";
import { logBillingEvent } from "@/lib/billing/analytics";
import { grantFromPayment, type Entitlement } from "@/lib/billing/entitlement";
import { openGiftClaim, sealGiftClaim, type GiftClaim } from "@/lib/billing/gift";
import type { PlanId, Processor, RegionId } from "@/lib/billing/plans";

export type GiftHold = {
  ref: string;
  planId: PlanId;
  regionId: RegionId;
  processor: Processor;
  until: string | null;
  sub?: string;
  buyerId: string;
  recipientEmail?: string;
  recipientUserId?: string;
  sentAt?: string;
  claimedAt?: string;
};

type ClerkPrivate = {
  hifzPlus?: unknown;
  hifzPlusEvents?: unknown;
  hifzGifts?: GiftHold[];
};

async function clerkUser(userId: string) {
  const client = await clerkClient();
  return client.users.getUser(userId);
}

function asHolds(raw: unknown): GiftHold[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is GiftHold => {
    if (!row || typeof row !== "object") return false;
    const rec = row as GiftHold;
    return Boolean(rec.ref && rec.planId && rec.regionId && rec.processor && rec.buyerId);
  });
}

export async function giftHoldsForBuyer(buyerId: string): Promise<GiftHold[]> {
  if (!clerkConfigured() || !buyerId) return [];
  try {
    const user = await clerkUser(buyerId);
    return asHolds((user.privateMetadata as ClerkPrivate | undefined)?.hifzGifts);
  } catch {
    return [];
  }
}

async function writeHolds(buyerId: string, holds: GiftHold[]) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(buyerId, {
    privateMetadata: { hifzGifts: holds },
  });
}

export async function recordGiftHold(hold: GiftHold): Promise<GiftHold> {
  if (!clerkConfigured()) return hold;
  const holds = await giftHoldsForBuyer(hold.buyerId);
  const existing = holds.find((row) => row.ref === hold.ref);
  if (existing) return existing;
  await writeHolds(hold.buyerId, [...holds, hold].slice(-20));
  logBillingEvent({
    type: "gift_hold",
    processor: hold.processor,
    planId: hold.planId,
    regionId: hold.regionId,
    hasUserId: true,
    accountId: hold.buyerId,
  });
  return hold;
}

export function holdToClaim(hold: GiftHold): GiftClaim {
  return {
    v: 1,
    planId: hold.planId,
    regionId: hold.regionId,
    processor: hold.processor,
    until: hold.until,
    ref: hold.ref,
    buyerId: hold.buyerId,
  };
}

export function holdToEntitlement(hold: GiftHold, userId?: string, email?: string, plus = true): Entitlement {
  return grantFromPayment({
    planId: hold.planId,
    regionId: hold.regionId,
    processor: hold.processor,
    until: hold.until,
    ref: hold.ref,
    sub: hold.sub,
    userId,
    email,
    plus,
  });
}

export async function markGiftAssigned(opts: {
  buyerId: string;
  ref: string;
  email: string;
  recipientUserId?: string;
}): Promise<GiftHold | null> {
  if (!clerkConfigured()) return null;
  const holds = await giftHoldsForBuyer(opts.buyerId);
  const index = holds.findIndex((row) => row.ref === opts.ref);
  if (index < 0) return null;
  const next: GiftHold = {
    ...holds[index],
    recipientEmail: opts.email,
    recipientUserId: opts.recipientUserId || holds[index]?.recipientUserId,
    sentAt: new Date().toISOString(),
  };
  holds[index] = next;
  await writeHolds(opts.buyerId, holds);
  return next;
}

export async function markGiftClaimed(opts: { buyerId: string; ref: string; recipientUserId: string }) {
  if (!clerkConfigured()) return;
  const holds = await giftHoldsForBuyer(opts.buyerId);
  const index = holds.findIndex((row) => row.ref === opts.ref);
  if (index < 0) return;
  holds[index] = {
    ...holds[index],
    recipientUserId: opts.recipientUserId,
    claimedAt: new Date().toISOString(),
  };
  await writeHolds(opts.buyerId, holds);
}

export async function createGiftInvitation(opts: { email: string; claim: GiftClaim; origin: string }) {
  const client = await clerkClient();
  const token = sealGiftClaim(opts.claim);
  const invitation = await client.invitations.createInvitation({
    emailAddress: opts.email,
    notify: false,
    ignoreExisting: true,
    publicMetadata: { dirasGift: token } as Record<string, string>,
    redirectUrl: `${opts.origin}/sign-up?redirect_url=/`,
  });
  return invitation.url || `${opts.origin}/sign-up`;
}

export function claimFromPublicMetadata(raw: unknown): GiftClaim | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as { dirasGift?: unknown; public_metadata?: { dirasGift?: unknown } };
  const token = rec.dirasGift ?? rec.public_metadata?.dirasGift;
  return typeof token === "string" ? openGiftClaim(token) : null;
}

export async function emailsOnClerkUser(userId: string): Promise<string[]> {
  if (!clerkConfigured()) return [];
  try {
    const user = await clerkUser(userId);
    const out = new Set<string>();
    const primary = user.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
    if (primary) out.add(primary);
    for (const row of user.emailAddresses || []) {
      const address = row.emailAddress?.trim().toLowerCase();
      if (address) out.add(address);
    }
    return [...out];
  } catch {
    return [];
  }
}

export async function invitationClaimForEmail(email: string): Promise<GiftClaim | null> {
  if (!clerkConfigured() || !email) return null;
  try {
    const client = await clerkClient();
    const { data } = await client.invitations.getInvitationList({
      query: email,
      status: "pending",
      limit: 5 as never,
    });
    for (const row of data) {
      const claim = claimFromPublicMetadata(row.publicMetadata);
      if (claim) return claim;
    }
  } catch {
    return null;
  }
  return null;
}

async function clearPublicGift(userId: string) {
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { dirasGift: null },
    });
  } catch {
    /* claim already applied */
  }
}

export async function claimGiftForUser(opts: {
  userId: string;
  emails?: string[];
  publicMetadata?: unknown;
}): Promise<boolean> {
  if (!clerkConfigured() || !opts.userId) return false;
  let claim = claimFromPublicMetadata(opts.publicMetadata);
  const emails = opts.emails?.length ? opts.emails : await emailsOnClerkUser(opts.userId);
  if (!claim) {
    for (const email of emails) {
      claim = await invitationClaimForEmail(email);
      if (claim) break;
    }
  }
  if (!claim) return false;

  const email = emails[0];
  const ent = grantFromPayment({
    planId: claim.planId,
    regionId: claim.regionId,
    processor: claim.processor,
    until: claim.until,
    ref: claim.ref,
    userId: opts.userId,
    email,
  });
  await savePlusToClerk(opts.userId, ent, "granted");
  await markGiftClaimed({ buyerId: claim.buyerId, ref: claim.ref, recipientUserId: opts.userId });
  await clearPublicGift(opts.userId);
  logBillingEvent({
    type: "gift_claimed",
    ok: true,
    processor: claim.processor,
    planId: claim.planId,
    regionId: claim.regionId,
    hasUserId: true,
    accountId: opts.userId,
  });
  try {
    const { sendPlusWelcome } = await import("@/lib/email/send");
    await sendPlusWelcome(ent);
  } catch {
    logBillingEvent({
      type: "welcome_failed",
      processor: claim.processor,
      planId: claim.planId,
      regionId: claim.regionId,
      hasUserId: true,
      accountId: opts.userId,
    });
  }
  return true;
}

export async function assignGiftToEmail(opts: {
  hold: GiftHold;
  email: string;
  origin: string;
}): Promise<{ hold: GiftHold; existingAccount: boolean; signUpUrl: string }> {
  const existingId = await clerkUserIdByEmail(opts.email);
  if (existingId) {
    const ent = holdToEntitlement(opts.hold, existingId, opts.email);
    await savePlusToClerk(existingId, ent, "granted");
    const hold =
      (await markGiftAssigned({
        buyerId: opts.hold.buyerId,
        ref: opts.hold.ref,
        email: opts.email,
        recipientUserId: existingId,
      })) || opts.hold;
    logBillingEvent({
      type: "gift_assigned",
      ok: true,
      processor: hold.processor,
      planId: hold.planId,
      regionId: hold.regionId,
      hasUserId: true,
      accountId: existingId,
    });
    try {
      const { sendPlusWelcome, sendGiftNotice } = await import("@/lib/email/send");
      await sendGiftNotice({
        to: opts.email,
        existingAccount: true,
        signUpUrl: `${opts.origin}/sign-in?redirect_url=/`,
      });
      await sendPlusWelcome(ent);
    } catch {
      logBillingEvent({
        type: "gift_failed",
        processor: hold.processor,
        planId: hold.planId,
        regionId: hold.regionId,
        hasUserId: true,
        accountId: existingId,
      });
    }
    return { hold, existingAccount: true, signUpUrl: `${opts.origin}/sign-in` };
  }

  const signUpUrl = await createGiftInvitation({
    email: opts.email,
    claim: holdToClaim(opts.hold),
    origin: opts.origin,
  });
  const hold =
    (await markGiftAssigned({
      buyerId: opts.hold.buyerId,
      ref: opts.hold.ref,
      email: opts.email,
    })) || opts.hold;
  logBillingEvent({
    type: "gift_assigned",
    ok: true,
    processor: hold.processor,
    planId: hold.planId,
    regionId: hold.regionId,
    hasUserId: true,
    accountId: opts.hold.buyerId,
  });
  try {
    const { sendGiftNotice } = await import("@/lib/email/send");
    await sendGiftNotice({
      to: opts.email,
      existingAccount: false,
      signUpUrl,
    });
  } catch {
    logBillingEvent({
      type: "gift_failed",
      processor: hold.processor,
      planId: hold.planId,
      regionId: hold.regionId,
      hasUserId: true,
      accountId: opts.hold.buyerId,
    });
  }
  return { hold, existingAccount: false, signUpUrl };
}

export async function renewGiftRecipients(buyerId: string, until: string | null, plus: boolean) {
  if (!clerkConfigured() || !buyerId) return 0;
  const holds = await giftHoldsForBuyer(buyerId);
  let n = 0;
  const next = holds.map((hold) => ({ ...hold, until: plus ? until : new Date().toISOString() }));
  await writeHolds(buyerId, next);
  for (const hold of next) {
    if (!hold.recipientUserId) continue;
    const ent = holdToEntitlement(hold, hold.recipientUserId, hold.recipientEmail, plus);
    await savePlusToClerk(hold.recipientUserId, ent, plus ? "renewed" : "revoked");
    n += 1;
  }
  return n;
}

export async function revokeGiftsForBuyer(buyerId: string) {
  return renewGiftRecipients(buyerId, new Date().toISOString(), false);
}
