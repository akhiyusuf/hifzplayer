/** Stripe invoice/subscription shapes we actually read. Avoids coupling tests to the SDK. */

export type StripeRef = string | { id?: string } | null | undefined;

export type StripeInvoiceLike = {
  id?: string;
  amount_paid?: number | null;
  total?: number | null;
  currency?: string | null;
  billing_reason?: string | null;
  customer_email?: string | null;
  subscription?: StripeRef;
  parent?: {
    subscription_details?: {
      subscription?: StripeRef;
      metadata?: Record<string, string> | null;
    } | null;
  } | null;
  metadata?: Record<string, string> | null;
};

export type StripeSubscriptionLike = {
  id?: string;
  status?: string;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string> | null;
  items?: { data?: Array<{ current_period_end?: number | null }> | null } | null;
};

function refId(value: StripeRef): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return (value.id || "").trim();
}

export function stripeInvoiceSubscriptionId(invoice: StripeInvoiceLike): string {
  return (
    refId(invoice.parent?.subscription_details?.subscription) ||
    refId(invoice.subscription)
  );
}

export function stripeInvoiceMetadata(invoice: StripeInvoiceLike): Record<string, string> {
  return {
    ...(invoice.metadata || {}),
    ...(invoice.parent?.subscription_details?.metadata || {}),
  };
}

export function stripeInvoiceAmount(invoice: StripeInvoiceLike): number {
  if (typeof invoice.amount_paid === "number") return invoice.amount_paid;
  if (typeof invoice.total === "number") return invoice.total;
  return -1;
}

export function stripeSubscriptionUntil(sub: StripeSubscriptionLike): string | null {
  const end = sub.items?.data?.[0]?.current_period_end;
  if (typeof end === "number" && end > 0) return new Date(end * 1000).toISOString();
  return null;
}
