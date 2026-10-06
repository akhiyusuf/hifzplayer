import { accountsConfigured } from "./config.ts";
import {
  plusFromAccount,
  savePlusToAccount,
  userIdByEmail,
} from "./plus.ts";
import { randomId } from "./crypto.ts";
import { sql } from "../db/neon.ts";
import { logBillingEvent } from "@/lib/billing/analytics";
import { grantFromPayment, type Entitlement } from "@/lib/billing/entitlement";
import { stackGiftOnEntitlement } from "@/lib/billing/entitlement-bind";
import { validateGiftEmails, classifyGiftRecipient, giftRecipientMessage } from "@/lib/billing/gift";
import type { PaidPlanId, Processor, RegionId } from "@/lib/billing/plans";

export type GiftHold = {
  id?: string;
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

type GiftRow = {
  id: string;
  buyer_id: string;
  ref: string;
  plan_id: string;
  region_id: string;
  processor: string;
  until: string | Date | null;
  sub: string | null;
  recipient_email: string | null;
  recipient_user_id: string | null;
  sent_at: string | Date | null;
  claimed_at: string | Date | null;
};

function iso(value: string | Date | null | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function rowToHold(row: GiftRow): GiftHold {
  return {
    id: row.id,
    ref: row.ref,
    planId: row.plan_id as PaidPlanId,
    regionId: row.region_id as RegionId,
    processor: row.processor as Exclude<Processor, "trial">,
    until: iso(row.until) || null,
    sub: row.sub || undefined,
    buyerId: row.buyer_id,
    recipientEmail: row.recipient_email || undefined,
    recipientUserId: row.recipient_user_id || undefined,
    sentAt: iso(row.sent_at),
    claimedAt: iso(row.claimed_at),
  };
}

export async function giftHoldsForBuyer(buyerId: string): Promise<GiftHold[]> {
  if (!accountsConfigured() || !buyerId) return [];
  try {
    const rows = await sql()`select * from gift_holds where buyer_id = ${buyerId} order by created_at desc limit 40`;
    return (rows as GiftRow[]).map(rowToHold);
  } catch {
    return [];
  }
}

export async function recordGiftHold(hold: GiftHold): Promise<GiftHold> {
  if (!accountsConfigured()) return hold;
  const id = hold.id || randomId("gft");
  const email = (hold.recipientEmail || "").toLowerCase() || null;
  await sql()`
    insert into gift_holds (
      id, buyer_id, ref, plan_id, region_id, processor, until, sub, recipient_email, recipient_user_id
    )
    values (
      ${id}, ${hold.buyerId}, ${hold.ref}, ${hold.planId}, ${hold.regionId}, ${hold.processor},
      ${hold.until}, ${hold.sub || null}, ${email}, ${hold.recipientUserId || null}
    )
  `;
  logBillingEvent({
    type: "gift_hold",
    processor: hold.processor,
    planId: hold.planId,
    regionId: hold.regionId,
    hasUserId: true,
    accountId: hold.buyerId,
  });
  return { ...hold, id, recipientEmail: email || undefined };
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
  if (!accountsConfigured()) return null;
  const email = opts.email.trim().toLowerCase();
  const holds = await giftHoldsForBuyer(opts.buyerId);
  let hold = holds.find((row) => row.ref === opts.ref && (row.recipientEmail || "").toLowerCase() === email);
  if (!hold) hold = holds.find((row) => row.ref === opts.ref && !row.sentAt);
  if (!hold) hold = holds.find((row) => row.ref === opts.ref);
  if (!hold?.id) return null;
  const sentAt = new Date().toISOString();
  await sql()`
    update gift_holds set
      recipient_email = ${email},
      recipient_user_id = ${opts.recipientUserId || hold.recipientUserId || null},
      sent_at = ${sentAt}
    where id = ${hold.id}
  `;
  return {
    ...hold,
    recipientEmail: email,
    recipientUserId: opts.recipientUserId || hold.recipientUserId,
    sentAt,
  };
}

export async function markGiftClaimed(opts: { buyerId: string; ref: string; recipientUserId: string }) {
  if (!accountsConfigured()) return;
  await sql()`
    update gift_holds set
      recipient_user_id = ${opts.recipientUserId},
      claimed_at = ${new Date().toISOString()}
    where buyer_id = ${opts.buyerId} and ref = ${opts.ref} and claimed_at is null
  `;
}

async function pendingHoldForEmail(email: string): Promise<GiftHold | null> {
  if (!accountsConfigured() || !email) return null;
  const address = email.trim().toLowerCase();
  try {
    const rows = await sql()`
      select * from gift_holds
      where recipient_email = ${address} and claimed_at is null
      order by created_at desc
      limit 1
    `;
    const row = rows[0] as GiftRow | undefined;
    return row ? rowToHold(row) : null;
  } catch {
    return null;
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
    const userId = await userIdByEmail(email);
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

export async function claimGiftForUser(opts: { userId: string; emails?: string[] }): Promise<boolean> {
  if (!accountsConfigured() || !opts.userId) return false;
  const emails = opts.emails?.length ? opts.emails : await (await import("./plus.ts")).emailsOnUser(opts.userId);
  let hold: GiftHold | null = null;
  for (const email of emails) {
    hold = await pendingHoldForEmail(email);
    if (hold) break;
  }
  if (!hold) return false;

  const email = emails[0];
  const gift = grantFromPayment({
    planId: hold.planId,
    regionId: hold.regionId,
    processor: hold.processor,
    until: hold.until,
    ref: hold.ref,
    userId: opts.userId,
    email,
  });
  const existing = await plusFromAccount(opts.userId);
  const stacked = stackedGiftEntitlement(existing, gift);
  await savePlusToAccount(opts.userId, stacked.next, stacked.alreadyPlus ? "renewed" : "granted");
  await markGiftClaimed({ buyerId: hold.buyerId, ref: hold.ref, recipientUserId: opts.userId });
  logBillingEvent({
    type: "gift_claimed",
    ok: true,
    processor: hold.processor,
    planId: hold.planId,
    regionId: hold.regionId,
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
      processor: hold.processor,
      planId: hold.planId,
      regionId: hold.regionId,
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
  const existingId = await userIdByEmail(opts.email);
  if (existingId) {
    const gift = holdToEntitlement(opts.hold, existingId, opts.email);
    const existing = await plusFromAccount(existingId);
    const stacked = stackedGiftEntitlement(existing, gift);
    await savePlusToAccount(existingId, stacked.next, stacked.alreadyPlus ? "renewed" : "granted");
    const hold =
      (await markGiftAssigned({
        buyerId: opts.hold.buyerId,
        ref: opts.hold.ref,
        email: opts.email,
        recipientUserId: existingId,
      })) || opts.hold;
    await markGiftClaimed({ buyerId: hold.buyerId, ref: hold.ref, recipientUserId: existingId });
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

  const signUpUrl = `${opts.origin}/sign-up`;
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
    const hold = await recordGiftHold({
      ...opts.hold,
      recipientEmail: email,
      recipientUserId: undefined,
      sentAt: undefined,
    });
    out.push(await assignGiftToEmail({ hold, email, origin: opts.origin }));
  }
  return out;
}

export async function renewGiftRecipients(buyerId: string, until: string | null, plus: boolean) {
  if (!accountsConfigured() || !buyerId) return 0;
  const holds = await giftHoldsForBuyer(buyerId);
  await sql()`update gift_holds set until = ${until} where buyer_id = ${buyerId}`;
  let n = 0;
  for (const hold of holds) {
    if (!hold.recipientUserId) continue;
    const ent = holdToEntitlement({ ...hold, until }, hold.recipientUserId, hold.recipientEmail, plus);
    await savePlusToAccount(hold.recipientUserId, ent, plus ? "renewed" : "revoked");
    n += 1;
  }
  return n;
}

export async function revokeGiftsForBuyer(buyerId: string) {
  return renewGiftRecipients(buyerId, new Date().toISOString(), false);
}
