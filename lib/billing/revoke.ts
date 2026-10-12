import { parseCheckoutMetadata } from "./match.ts";

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Paystack puts the original payment on data.transaction.reference (or a flat reference). */
export function paystackDisputeReference(data: unknown): string {
  const rec = asRecord(data);
  if (!rec) return "";
  const nested = asRecord(rec.transaction);
  return (
    (nested && asString(nested.reference)) ||
    asString(rec.transaction_reference) ||
    asString(rec.reference)
  );
}

export function userIdFromMetadata(raw: unknown): string {
  return parseCheckoutMetadata(raw).userId;
}

export function userIdFromPaystackDispute(data: unknown): string {
  const rec = asRecord(data);
  if (!rec) return "";
  const tx = asRecord(rec.transaction);
  return (
    userIdFromMetadata(rec.metadata) ||
    userIdFromMetadata(tx) ||
    (tx ? userIdFromMetadata(tx.metadata) : "")
  );
}

export function userIdFromStripeMetas(
  sources: Array<Record<string, string | undefined> | null | undefined>,
): string {
  for (const source of sources) {
    const id = source?.userId?.trim() || source?.buyerId?.trim();
    if (id) return id;
  }
  return "";
}

function stripeMeta(
  obj: { metadata?: StripeLikeMeta | null } | string | null | undefined,
): Record<string, string | undefined> | undefined {
  if (!obj || typeof obj === "string") return undefined;
  return obj.metadata || undefined;
}

type StripeLikeMeta = Record<string, string | undefined>;

type StripeInvoiceLike = {
  subscription?: { metadata?: StripeLikeMeta | null; id?: string } | string | null;
  parent?: {
    subscription_details?: {
      metadata?: StripeLikeMeta | null;
      subscription?: { metadata?: StripeLikeMeta | null; id?: string } | string | null;
    } | null;
  } | null;
};

function stripeInvoiceUserMetas(
  invoice: StripeInvoiceLike,
): Array<Record<string, string | undefined> | undefined> {
  const details = invoice.parent?.subscription_details;
  return [
    details?.metadata || undefined,
    stripeMeta(details?.subscription),
    stripeMeta(invoice.subscription),
  ];
}

/** Charge / PaymentIntent / Invoice.subscription metadata we copy at checkout. */
export function userIdFromStripeCharge(charge: {
  metadata?: StripeLikeMeta | null;
  payment_intent?: { metadata?: StripeLikeMeta | null } | string | null;
  invoice?: StripeInvoiceLike | string | null;
}): string {
  const invoice = charge.invoice && typeof charge.invoice !== "string" ? charge.invoice : null;
  return userIdFromStripeMetas([
    charge.metadata || undefined,
    stripeMeta(charge.payment_intent),
    ...(invoice ? stripeInvoiceUserMetas(invoice) : []),
  ]);
}

export function subscriptionIdFromStripeInvoice(
  invoice: StripeInvoiceLike | null | undefined,
): string {
  if (!invoice) return "";
  const nested = invoice.parent?.subscription_details?.subscription;
  if (typeof nested === "string") return nested;
  if (nested?.id) return nested.id;
  const legacy = invoice.subscription;
  if (typeof legacy === "string") return legacy;
  if (legacy?.id) return legacy.id;
  return "";
}
