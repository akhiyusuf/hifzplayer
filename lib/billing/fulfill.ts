import { NextResponse } from "next/server";
import { PLUS_NAME } from "@/lib/brand";
import { recordGiftHold, renewGiftRecipients, type GiftHold } from "@/lib/auth/gifts";
import { clerkConfigured } from "@/lib/auth/config";
import { clerkUserIdByEmail, plusFromClerk } from "@/lib/auth/plus";
import { grantPlusToAccount, signedInUserId } from "@/lib/auth/session";
import { logBillingEvent, type BillingEvent } from "./analytics";
import { grantFromPayment, periodEnd, publicEntitlement, type Entitlement } from "./entitlement";
import { parseCheckoutMetadata, resolvePaidPlan, type PaidPlan } from "./match";
import {
  paystackChargeUntil,
  paystackHasPlan,
  type PaystackSubscriptionEvent,
  verifyPaystackReference,
} from "./paystack";
import { retrieveStripeSession, retrieveStripeSubscription } from "./stripe";
import {
  stripeInvoiceAmount,
  stripeInvoiceMetadata,
  stripeInvoiceSubscriptionId,
  stripeSubscriptionUntil,
  type StripeInvoiceLike,
  type StripeSubscriptionLike,
} from "./stripe-parse";

export type FulfillSource = "confirm" | "return" | "webhook";
export type FulfillKind = "granted" | "renewed" | "revoked";

export type FulfillOk = { ok: true; entitlement: Entitlement; kind: FulfillKind };
export type FulfillErr = { ok: false; status: number; error: string };
export type FulfillSkip = { ok: true; skipped: true };
export type FulfillGift = { ok: true; gift: true; hold: GiftHold };
export type FulfillResult = FulfillOk | FulfillErr | FulfillSkip | FulfillGift;

function fail(status: number, error: string, extra?: Omit<Partial<BillingEvent>, "type">): FulfillErr {
  logBillingEvent({
    type: "confirm_failed",
    ok: false,
    reason: error,
    ...extra,
  });
  return { ok: false, status, error };
}

function isFulfillErr(value: { userId: string | null } | FulfillErr): value is FulfillErr {
  return "ok" in value && value.ok === false;
}

function ownerForGrant(opts: {
  source: FulfillSource;
  metadataUserId?: string;
  signedInUserId: string | null;
  accountsOn: boolean;
}): { userId: string | null } | FulfillErr {
  const meta = opts.metadataUserId || "";
  const signedIn = opts.signedInUserId;

  if (opts.source === "webhook") {
    return { userId: meta || null };
  }

  if (opts.accountsOn && meta && signedIn && meta !== signedIn) {
    return fail(403, `This payment is for another account. Sign in with the account you used at checkout.`, {
      source: opts.source,
      hasUserId: true,
      accountId: signedIn,
    });
  }

  if (opts.accountsOn && opts.source === "confirm" && !signedIn && !meta) {
    return fail(401, `Sign in to attach ${PLUS_NAME} to your account`, {
      source: opts.source,
      hasUserId: false,
    });
  }

  return { userId: meta || signedIn || null };
}

async function persist(
  ent: Entitlement,
  userId: string | null,
  setCookie: boolean,
  source: FulfillSource,
  kind: FulfillKind,
): Promise<Entitlement> {
  if (!setCookie && !userId) {
    logBillingEvent({
      type: "webhook_received",
      processor: ent.processor,
      planId: ent.planId,
      regionId: ent.regionId,
      source,
      hasUserId: false,
      reason: "no_account_to_grant",
    });
    return ent;
  }
  const next = await grantPlusToAccount(ent, userId, { setCookie, kind });
  logBillingEvent({
    type: kind,
    ok: true,
    processor: next.processor,
    planId: next.planId,
    regionId: next.regionId,
    source,
    hasUserId: Boolean(next.userId),
    accountId: next.userId,
  });
  if (kind === "granted") {
    try {
      const { sendPlusWelcome } = await import("@/lib/email/send");
      await sendPlusWelcome(next);
    } catch {
      logBillingEvent({
        type: "welcome_failed",
        processor: next.processor,
        planId: next.planId,
        regionId: next.regionId,
        hasUserId: Boolean(next.userId),
        accountId: next.userId,
      });
    }
  }
  return next;
}

async function kindForUser(userId: string | null, plus: boolean): Promise<FulfillKind> {
  if (!plus) return "revoked";
  if (!userId) return "granted";
  const existing = await plusFromClerk(userId);
  return existing ? "renewed" : "granted";
}

async function holdPaidGift(opts: {
  paid: PaidPlan;
  ref: string;
  until: string | null;
  sub?: string;
  processor: "stripe" | "paystack";
  signedIn: string | null;
  source: FulfillSource;
}): Promise<FulfillGift | FulfillErr> {
  const buyerId = opts.paid.buyerId || opts.signedIn || "";
  if (!buyerId) {
    return fail(401, `Sign in to attach this ${PLUS_NAME} gift`, {
      processor: opts.processor,
      source: opts.source,
      hasUserId: false,
    });
  }
  const hold = await recordGiftHold({
    ref: opts.ref,
    planId: opts.paid.planId,
    regionId: opts.paid.regionId,
    processor: opts.processor,
    until: opts.until,
    sub: opts.sub,
    buyerId,
  });
  return { ok: true, gift: true, hold };
}

async function renewPaidGift(metadata: unknown, until: string | null, plus: boolean): Promise<FulfillSkip | FulfillErr> {
  const meta = parseCheckoutMetadata(metadata);
  const buyerId = meta.buyerId || meta.userId;
  if (!buyerId) {
    return fail(400, "Gift renewal is missing the buyer account", { hasUserId: false });
  }
  await renewGiftRecipients(buyerId, until, plus);
  return { ok: true, skipped: true };
}

export async function fulfillPaystackReference(
  reference: string,
  opts: { source: FulfillSource; setCookie: boolean; signedInUserId?: string | null },
): Promise<FulfillResult> {
  const ref = reference.trim();
  if (!ref) return fail(400, "Missing payment reference", { processor: "paystack", source: opts.source });

  let verified;
  try {
    verified = await verifyPaystackReference(ref);
  } catch {
    return fail(502, "Could not reach the payment provider", { processor: "paystack", source: opts.source });
  }

  const data = verified.data;
  if (data.status !== "success") {
    return fail(402, "Payment is not complete yet", { processor: "paystack", source: opts.source });
  }

  const paid = resolvePaidPlan({
    amount: data.amount,
    currency: data.currency,
    metadata: data.metadata,
    allowAmountDrift: paystackHasPlan(data),
  });
  if ("error" in paid) {
    return fail(paid.error.includes("amount") ? 409 : 400, paid.error, {
      processor: "paystack",
      source: opts.source,
    });
  }

  const accountsOn = clerkConfigured();
  const signedIn = opts.signedInUserId === undefined ? await signedInUserId() : opts.signedInUserId;
  const owner = ownerForGrant({
    source: opts.source,
    metadataUserId: paid.userId,
    signedInUserId: signedIn,
    accountsOn,
  });
  if (isFulfillErr(owner)) return owner;

  const until = paystackChargeUntil(data, paid.planId, periodEnd);
  if (paid.gift) {
    return holdPaidGift({
      paid,
      ref: data.reference,
      until,
      sub: data.subscription?.subscription_code || undefined,
      processor: "paystack",
      signedIn,
      source: opts.source,
    });
  }
  const kind = await kindForUser(owner.userId, true);
  const ent = grantFromPayment({
    planId: paid.planId,
    regionId: paid.regionId,
    processor: "paystack",
    email: data.customer?.email,
    userId: owner.userId || undefined,
    ref: data.reference,
    until,
    sub: data.subscription?.subscription_code,
  });
  const next = await persist(ent, owner.userId, opts.setCookie, opts.source, kind);
  return { ok: true, entitlement: next, kind };
}

export async function fulfillStripeSession(
  sessionId: string,
  opts: { source: FulfillSource; setCookie: boolean; signedInUserId?: string | null },
): Promise<FulfillResult> {
  const id = sessionId.trim();
  if (!id) return fail(400, "Missing checkout session", { processor: "stripe", source: opts.source });

  let session;
  try {
    session = await retrieveStripeSession(id);
  } catch {
    return fail(502, "Could not reach the payment provider", { processor: "stripe", source: opts.source });
  }

  const paid = session.payment_status === "paid" || session.status === "complete";
  if (!paid) {
    return fail(402, "Payment is not complete yet", { processor: "stripe", source: opts.source });
  }

  const resolved = resolvePaidPlan({
    amount: session.amount_total ?? -1,
    currency: session.currency || "",
    metadata: session.metadata,
  });
  if ("error" in resolved) {
    return fail(resolved.error.includes("amount") ? 409 : 400, resolved.error, {
      processor: "stripe",
      source: opts.source,
    });
  }

  let until = periodEnd(resolved.planId);
  let subId = "";
  const sub = session.subscription;
  if (resolved.planId !== "lifetime" && sub) {
    const expanded = typeof sub === "string" ? null : (sub as StripeSubscriptionLike);
    subId = typeof sub === "string" ? sub : expanded?.id || "";
    if (expanded) {
      const end = stripeSubscriptionUntil(expanded);
      if (end) until = end;
    } else if (subId) {
      try {
        const fetched = await retrieveStripeSubscription(subId);
        const end = stripeSubscriptionUntil(fetched);
        if (end) until = end;
      } catch {
        /* keep catalog period */
      }
    }
  }

  const accountsOn = clerkConfigured();
  const signedIn = opts.signedInUserId === undefined ? await signedInUserId() : opts.signedInUserId;
  const metaUser = session.metadata?.userId || resolved.userId;
  const owner = ownerForGrant({
    source: opts.source,
    metadataUserId: metaUser,
    signedInUserId: signedIn,
    accountsOn,
  });
  if (isFulfillErr(owner)) return owner;

  if (resolved.gift) {
    return holdPaidGift({
      paid: resolved,
      ref: session.id,
      until,
      sub: subId || undefined,
      processor: "stripe",
      signedIn,
      source: opts.source,
    });
  }

  const kind = await kindForUser(owner.userId, true);
  const ent = grantFromPayment({
    planId: resolved.planId,
    regionId: resolved.regionId,
    processor: "stripe",
    email: session.customer_details?.email || session.customer_email || undefined,
    userId: owner.userId || undefined,
    ref: session.id,
    until,
    sub: subId || undefined,
  });
  const next = await persist(ent, owner.userId, opts.setCookie, opts.source, kind);
  return { ok: true, entitlement: next, kind };
}

export async function fulfillStripeInvoice(
  invoice: StripeInvoiceLike,
  opts: { source: FulfillSource; setCookie: boolean },
): Promise<FulfillResult> {
  const amount = stripeInvoiceAmount(invoice);
  if (amount <= 0) return { ok: true, skipped: true };

  const subId = stripeInvoiceSubscriptionId(invoice);
  let sub: StripeSubscriptionLike | null = null;
  if (subId) {
    try {
      sub = await retrieveStripeSubscription(subId);
    } catch {
      return fail(502, "Could not reach the payment provider", { processor: "stripe", source: opts.source });
    }
  }

  const metadata = {
    ...stripeInvoiceMetadata(invoice),
    ...(sub?.metadata || {}),
  };
  const resolved = resolvePaidPlan({
    amount,
    currency: invoice.currency || "",
    metadata,
    allowAmountDrift: true,
  });
  if ("error" in resolved) {
    return fail(resolved.error.includes("amount") ? 409 : 400, resolved.error, {
      processor: "stripe",
      source: opts.source,
    });
  }
  if (resolved.planId === "lifetime") return { ok: true, skipped: true };

  const until = (sub && stripeSubscriptionUntil(sub)) || periodEnd(resolved.planId);
  if (resolved.gift || parseCheckoutMetadata(metadata).gift) {
    return renewPaidGift({ ...metadata, buyerId: resolved.buyerId || metadata.buyerId }, until, true);
  }

  let userId = resolved.userId || metadata.userId || "";
  if (!userId && invoice.customer_email) {
    userId = (await clerkUserIdByEmail(invoice.customer_email)) || "";
  }

  const owner = { userId: userId || null };
  const kind = await kindForUser(owner.userId, true);
  const ent = grantFromPayment({
    planId: resolved.planId,
    regionId: resolved.regionId,
    processor: "stripe",
    email: invoice.customer_email || undefined,
    userId: owner.userId || undefined,
    ref: invoice.id || subId || "stripe-invoice",
    until,
    sub: subId || undefined,
  });
  const next = await persist(ent, owner.userId, opts.setCookie, opts.source, kind);
  return { ok: true, entitlement: next, kind };
}

export async function fulfillStripeSubscription(
  sub: StripeSubscriptionLike & { id?: string },
  opts: { source: FulfillSource; setCookie: boolean; plus: boolean },
): Promise<FulfillResult> {
  const metadata = sub.metadata || {};
  let resolved = resolvePaidPlan({
    amount: -1,
    currency: "",
    metadata,
    allowAmountDrift: true,
  });
  let userId = (!("error" in resolved) && resolved.userId) || metadata.userId || "";
  if ("error" in resolved) {
    const existing = userId ? await plusFromClerk(userId) : null;
    if (!existing) return fail(400, resolved.error, { processor: "stripe", source: opts.source });
    resolved = { planId: existing.planId, regionId: existing.regionId, userId };
  }
  if (resolved.planId === "lifetime") return { ok: true, skipped: true };

  const until = opts.plus ? stripeSubscriptionUntil(sub) || periodEnd(resolved.planId) : new Date().toISOString();
  if (resolved.gift || parseCheckoutMetadata(metadata).gift) {
    return renewPaidGift(
      { ...metadata, buyerId: (!("error" in resolved) && resolved.buyerId) || metadata.buyerId },
      until,
      opts.plus,
    );
  }
  const kind = opts.plus ? await kindForUser(userId || null, true) : "revoked";
  const ent = grantFromPayment({
    planId: resolved.planId,
    regionId: resolved.regionId,
    processor: "stripe",
    userId: userId || undefined,
    ref: sub.id || "stripe-sub",
    until,
    plus: opts.plus,
    sub: sub.id,
  });
  const next = await persist(ent, userId || null, opts.setCookie, opts.source, kind);
  return { ok: true, entitlement: next, kind };
}

export async function fulfillPaystackSubscriptionEvent(
  data: PaystackSubscriptionEvent,
  opts: { source: FulfillSource; setCookie: boolean; plus: boolean },
): Promise<FulfillResult> {
  const metadata = data.metadata;
  let resolved = resolvePaidPlan({
    amount: -1,
    currency: "",
    metadata,
    allowAmountDrift: true,
  });

  let userId = "";
  if (!("error" in resolved) && resolved.userId) userId = resolved.userId;
  if (!userId && data.customer?.email) {
    userId = (await clerkUserIdByEmail(data.customer.email)) || "";
  }
  if ("error" in resolved) {
    const existing = userId ? await plusFromClerk(userId) : null;
    if (!existing) {
      return fail(400, resolved.error, { processor: "paystack", source: opts.source });
    }
    resolved = { planId: existing.planId, regionId: existing.regionId, userId };
  }
  const planId = resolved.planId;
  const regionId = resolved.regionId;
  if (planId === "lifetime") return { ok: true, skipped: true };

  const nextDate = data.next_payment_date ? Date.parse(data.next_payment_date) : 0;
  const keepUntilPeriod = opts.plus === false && nextDate > Date.now();
  const plus = opts.plus || keepUntilPeriod;
  const until = plus
    ? keepUntilPeriod
      ? new Date(nextDate).toISOString()
      : periodEnd(planId)
    : new Date().toISOString();

  if (resolved.gift || parseCheckoutMetadata(metadata).gift) {
    const rec = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
    return renewPaidGift({ ...rec, buyerId: resolved.buyerId || userId }, until, plus);
  }

  const kind = plus ? await kindForUser(userId || null, true) : "revoked";
  const ent = grantFromPayment({
    planId,
    regionId,
    processor: "paystack",
    email: data.customer?.email,
    userId: userId || undefined,
    ref: data.subscription_code || "paystack-sub",
    until,
    plus,
    sub: data.subscription_code,
  });
  const next = await persist(ent, userId || null, opts.setCookie, opts.source, kind);
  return { ok: true, entitlement: next, kind };
}

export function isFulfillGranted(result: FulfillResult): result is FulfillOk {
  return Boolean(result.ok && "entitlement" in result);
}

export function isFulfillGift(result: FulfillResult): result is FulfillGift {
  return Boolean(result.ok && "gift" in result && result.gift);
}

export function fulfillJson(result: FulfillResult) {
  if (isFulfillGift(result)) {
    return NextResponse.json({
      ok: true,
      gift: true,
      plus: false,
      planId: result.hold.planId,
    });
  }
  if (isFulfillGranted(result)) {
    return NextResponse.json({ ok: true, ...publicEntitlement(result.entitlement) });
  }
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, plus: false },
      { status: result.status },
    );
  }
  return NextResponse.json({ ok: true, skipped: true });
}

export function webhookJson(result: FulfillResult, type: string) {
  if (isFulfillGranted(result)) {
    return Response.json({ received: true, type, fulfilled: true, kind: result.kind });
  }
  if (!result.ok) {
    return Response.json(
      { received: true, type, fulfilled: false },
      { status: result.status >= 500 ? 500 : 200 },
    );
  }
  return Response.json({ received: true, type, skipped: true });
}
