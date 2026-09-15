import { clerkClient } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/auth/config";
import { clerkUserIdByEmail, plusFromClerk, savePlusToClerk } from "@/lib/auth/plus";
import { logBillingEvent } from "@/lib/billing/analytics";
import { grantFromPayment, type Entitlement } from "@/lib/billing/entitlement";
import { stackGiftOnEntitlement } from "@/lib/billing/entitlement-bind";
import { openGiftClaim, sealGiftClaim, validateGiftEmails, classifyGiftRecipient, giftRecipientMessage, type GiftClaim } from "@/lib/billing/gift";
import type { PaidPlanId, Processor, RegionId } from "@/lib/billing/plans";

export type GiftHold = {
  ref: string;
  planId: PaidPlanId;
  regionId: RegionId;
  processor: Exclude<Processor, "trial">;
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
  const email = (hold.recipientEmail || "").toLowerCase();
  const existing = holds.find(
    (row) => row.ref === hold.ref && (row.recipientEmail || "").toLowerCase() === email,
  );
  if (existing) return existing;
  await writeHolds(hold.buyerId, [...holds, hold].slice(-40));
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
  const email = opts.email.trim().toLowerCase();
  let index = holds.findIndex(
    (row) => row.ref === opts.ref && (row.recipientEmail || "").toLowerCase() === email,
  );
  if (index < 0) {
    index = holds.findIndex((row) => row.ref === opts.ref && !row.sentAt);
  }
  if (index < 0) index = holds.findIndex((row) => row.ref === opts.ref);
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

export type GiftRecipientRow = {
  email: string;
  userId: string | null;
  existingAccount: boolean;
};

export async function resolveGiftRecipients(opts: {
  emails: string | string[];
  buyerId: string;
  buyerEmail?: string;
  seats?: string | number;
}): Promise<{ recipients: GiftRecipientRow[] } | { error: string }> {
  const parsed = validateGiftEmails(opts.emails, opts.seats);
  if ("error" in parsed) return parsed;
  const recipients: GiftRecipientRow[] = [];
  for (const email of parsed.emails) {
    const userId = await clerkUserIdByEmail(email);
    const kind = classifyGiftRecipient({
      buyerId: opts.buyerId,
      buyerEmail: opts.buyerEmail,
      recipientEmail: email,
      recipientUserId: userId,
    });
    if (kind === "self") return { error: giftRecipientMessage("self") };
    recipients.push({ email, userId, existingAccount: Boolean(userId) });
  }
  return { recipients };
}

export async function resolveGiftRecipient(opts: {
  email: string;
  buyerId: string;
  buyerEmail?: string;
}): Promise<{ userId: string | null; email: string; existingAccount: boolean } | { error: string }> {
  const looked = await resolveGiftRecipients({
    emails: opts.email,
    buyerId: opts.buyerId,
    buyerEmail: opts.buyerEmail,
    seats: 1,
  });
  if ("error" in looked) return looked;
  const row = looked.recipients[0];
  return { userId: row.userId, email: row.email, existingAccount: row.existingAccount };
}

function stackedGiftEntitlement(existing: Entitlement | null, gift: Entitlement) {
  return stackGiftOnEntitlement(existing, gift);
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
  const gift = grantFromPayment({
    planId: claim.planId,
    regionId: claim.regionId,
    processor: claim.processor,
    until: claim.until,
    ref: claim.ref,
    userId: opts.userId,
    email,
  });
  const existing = await plusFromClerk(opts.userId);
  const stacked = stackedGiftEntitlement(existing, gift);
  await savePlusToClerk(opts.userId, stacked.next, stacked.alreadyPlus ? "renewed" : "granted");
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
    reason: stacked.stacked ? "gift_extra_time" : stacked.keptLifetime ? "gift_kept_lifetime" : undefined,
  });
  try {
    const { sendPlusWelcome } = await import("@/lib/email/send");
    if (!stacked.alreadyPlus) await sendPlusWelcome(stacked.next);
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

export type GiftAssignResult = {
  hold: GiftHold;
  existingAccount: boolean;
  alreadyPlus: boolean;
  stacked: boolean;
  keptLifetime: boolean;
  signUpUrl: string;
};

export async function assignGiftToEmail(opts: {
  hold: GiftHold;
  email: string;
  origin: string;
}): Promise<GiftAssignResult> {
  const existingId = await clerkUserIdByEmail(opts.email);
  if (existingId) {
    const gift = holdToEntitlement(opts.hold, existingId, opts.email);
    const existing = await plusFromClerk(existingId);
    const stacked = stackedGiftEntitlement(existing, gift);
    await savePlusToClerk(existingId, stacked.next, stacked.alreadyPlus ? "renewed" : "granted");
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
      reason: stacked.stacked ? "gift_extra_time" : stacked.keptLifetime ? "gift_kept_lifetime" : undefined,
    });
    try {
      const { sendPlusWelcome, sendGiftNotice } = await import("@/lib/email/send");
      await sendGiftNotice({
        to: opts.email,
        existingAccount: true,
        alreadyPlus: stacked.alreadyPlus,
        stacked: stacked.stacked,
        keptLifetime: stacked.keptLifetime,
        planId: hold.planId,
        signUpUrl: `${opts.origin}/sign-in?redirect_url=/`,
      });
      if (!stacked.alreadyPlus) await sendPlusWelcome(stacked.next);
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
    return {
      hold,
      existingAccount: true,
      alreadyPlus: stacked.alreadyPlus,
      stacked: stacked.stacked,
      keptLifetime: stacked.keptLifetime,
      signUpUrl: `${opts.origin}/sign-in`,
    };
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
  return {
    hold,
    existingAccount: false,
    alreadyPlus: false,
    stacked: false,
    keptLifetime: false,
    signUpUrl,
  };
}

export async function assignGiftsToEmails(opts: {
  hold: GiftHold;
  emails: string[];
  origin: string;
}): Promise<GiftAssignResult[]> {
  const out: GiftAssignResult[] = [];
  for (const email of opts.emails) {
    const hold = await recordGiftHold({ ...opts.hold, recipientEmail: email, recipientUserId: undefined, sentAt: undefined });
    out.push(await assignGiftToEmail({ hold, email, origin: opts.origin }));
  }
  return out;
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
