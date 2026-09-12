import { clerkPlusRevoked, revokePlusOnClerk } from "@/lib/auth/plus";
import { logBillingEvent } from "./analytics";
import { parseCheckoutMetadata } from "./match";
import { verifyPaystackReference } from "./paystack";
import { isPlanId, type Processor } from "./plans";
import { stripeClient } from "./stripe";
import {
  paystackDisputeReference,
  subscriptionIdFromStripeInvoice,
  userIdFromPaystackDispute,
  userIdFromStripeCharge,
  userIdFromStripeMetas,
} from "./revoke";
import type Stripe from "stripe";

const CANCELABLE_SUB = new Set(["active", "trialing", "past_due", "unpaid", "paused"]);

async function stripAccount(userId: string, processor: Processor) {
  await revokePlusOnClerk(userId);
  logBillingEvent({
    type: "revoked",
    ok: true,
    processor,
    source: "webhook",
    reason: "chargeback",
    hasUserId: true,
  });
  return { revoked: true, hasUserId: true };
}

function unmatched(processor: Processor) {
  logBillingEvent({
    type: "revoked",
    ok: false,
    processor,
    source: "webhook",
    reason: "chargeback_no_account",
    hasUserId: false,
  });
  return { revoked: false, hasUserId: false };
}

function idOf(value: string | { id?: string } | null | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.id || "";
}

async function invoiceForPaymentIntent(stripe: Stripe, piId: string) {
  const payments = await stripe.invoicePayments.list({
    payment: { type: "payment_intent", payment_intent: piId },
    limit: 1,
    expand: ["data.invoice.parent.subscription_details.subscription"],
  });
  const raw = payments.data[0]?.invoice;
  if (!raw) return null;
  if (typeof raw === "string") {
    return stripe.invoices.retrieve(raw, {
      expand: ["parent.subscription_details.subscription"],
    });
  }
  if ("deleted" in raw && raw.deleted) return null;
  return raw;
}

async function plusSubscriptionsForCustomer(stripe: Stripe, customerId: string, userId: string) {
  const list = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
  return list.data.filter((sub) => {
    if (!isPlanId(sub.metadata?.planId || "")) return false;
    const owner = sub.metadata?.userId?.trim();
    if (!userId) return true;
    return !owner || owner === userId;
  });
}

async function cancelStripeSubscription(stripe: Stripe, subId: string) {
  try {
    await stripe.subscriptions.cancel(subId);
  } catch {
    logBillingEvent({
      type: "revoked",
      ok: false,
      processor: "stripe",
      source: "webhook",
      reason: "chargeback_cancel_failed",
      hasUserId: true,
    });
  }
}

export async function revokePlusFromPaystackDispute(data: unknown) {
  const reference = paystackDisputeReference(data);
  let userId = userIdFromPaystackDispute(data);
  if (!userId && reference) {
    try {
      const verified = await verifyPaystackReference(reference);
      userId = parseCheckoutMetadata(verified.data.metadata).userId;
    } catch {
      /* fall through */
    }
  }
  if (!userId) return unmatched("paystack");
  if (await clerkPlusRevoked(userId)) return { revoked: true, hasUserId: true };
  return stripAccount(userId, "paystack");
}

export async function revokePlusFromStripeDispute(dispute: Stripe.Dispute) {
  const stripe = stripeClient();
  const chargeId = idOf(dispute.charge);
  if (!chargeId) return unmatched("stripe");

  const charge = await stripe.charges.retrieve(chargeId, {
    expand: ["payment_intent"],
  });
  const pi =
    charge.payment_intent && typeof charge.payment_intent !== "string"
      ? charge.payment_intent
      : null;
  const piId = pi?.id || (typeof charge.payment_intent === "string" ? charge.payment_intent : "");

  let invoice: Stripe.Invoice | null = null;
  if (piId) {
    try {
      invoice = await invoiceForPaymentIntent(stripe, piId);
    } catch {
      /* lifetime charges have no invoice */
    }
  }

  const subFromInvoice = invoice?.parent?.subscription_details?.subscription;
  const sub =
    subFromInvoice && typeof subFromInvoice !== "string" ? subFromInvoice : null;
  let subId = subscriptionIdFromStripeInvoice(invoice);
  let userId = userIdFromStripeMetas([
    charge.metadata,
    pi?.metadata,
    invoice?.parent?.subscription_details?.metadata || undefined,
    sub?.metadata,
  ]);
  if (!userId) {
    userId = userIdFromStripeCharge({
      metadata: charge.metadata,
      payment_intent: pi,
      invoice,
    });
  }

  const customerId = idOf(charge.customer) || idOf(pi?.customer);
  if (customerId && (!userId || !subId)) {
    try {
      const subs = await plusSubscriptionsForCustomer(stripe, customerId, userId);
      if (!userId) {
        userId = subs.map((item) => item.metadata?.userId?.trim()).find(Boolean) || "";
      }
      if (!subId) {
        subId = subs.find((item) => CANCELABLE_SUB.has(item.status))?.id || "";
      }
    } catch {
      /* still try Clerk revoke if we have a user id */
    }
  }

  if (!userId) return unmatched("stripe");
  if (subId) await cancelStripeSubscription(stripe, subId);
  if (await clerkPlusRevoked(userId)) return { revoked: true, hasUserId: true };
  return stripAccount(userId, "stripe");
}
