export type WebhookAction = "checkout" | "renew" | "revoke" | "fail" | "ignore";

export function stripeWebhookAction(type: string): WebhookAction {
  switch (type) {
    case "checkout.session.completed":
      return "checkout";
    case "invoice.paid":
    case "invoice.payment_succeeded":
      return "renew";
    case "invoice.payment_failed":
      return "fail";
    case "customer.subscription.deleted":
      return "revoke";
    case "customer.subscription.updated":
      return "renew";
    default:
      return "ignore";
  }
}

export function stripeSubscriptionAction(status: string, cancelAtPeriodEnd: boolean): WebhookAction {
  const s = (status || "").toLowerCase();
  if (s === "canceled" || s === "unpaid" || s === "incomplete_expired") return "revoke";
  if (s === "past_due" || s === "incomplete") return "fail";
  if (s === "active" || s === "trialing") return cancelAtPeriodEnd ? "renew" : "renew";
  return "ignore";
}

export function paystackWebhookAction(type: string): WebhookAction {
  switch (type) {
    case "charge.success":
      return "checkout";
    case "invoice.payment_failed":
      return "fail";
    case "subscription.disable":
    case "subscription.not_renew":
      return "revoke";
    default:
      return "ignore";
  }
}
