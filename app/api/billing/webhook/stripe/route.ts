import { logBillingEvent } from "@/lib/billing/analytics";
import { stripeWebhookSecret } from "@/lib/billing/env";
import {
  fulfillStripeInvoice,
  fulfillStripeSession,
  fulfillStripeSubscription,
  webhookJson,
} from "@/lib/billing/fulfill";
import { stripeSubscriptionAction, stripeWebhookAction } from "@/lib/billing/webhook-kind";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = stripeWebhookSecret();
  if (!secret) {
    return Response.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing stripe-signature" }, { status: 400 });

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(raw, signature, secret);
  } catch {
    return Response.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  const action = stripeWebhookAction(event.type);
  logBillingEvent({
    type: action === "fail" ? "payment_failed" : "webhook_received",
    processor: "stripe",
    source: "webhook",
    reason: event.type,
    ok: action !== "fail",
  });

  if (event.type === "charge.dispute.created") {
    try {
      const { revokePlusFromStripeDispute } = await import("@/lib/billing/revoke-apply");
      const result = await revokePlusFromStripeDispute(event.data.object);
      return Response.json({ received: true, type: event.type, revoked: result.revoked });
    } catch {
      return Response.json({ received: true, type: event.type, revoked: false }, { status: 500 });
    }
  }

  if (action === "checkout" && event.type === "checkout.session.completed") {
    const session = event.data.object;
    const result = await fulfillStripeSession(session.id, {
      source: "webhook",
      setCookie: false,
      signedInUserId: null,
    });
    return webhookJson(result, event.type);
  }

  if (action === "renew" && (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded")) {
    const invoice = event.data.object;
    const result = await fulfillStripeInvoice(invoice, { source: "webhook", setCookie: false });
    return webhookJson(result, event.type);
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    const subAction =
      event.type === "customer.subscription.deleted"
        ? "revoke"
        : stripeSubscriptionAction(sub.status, Boolean(sub.cancel_at_period_end));
    if (subAction === "fail") {
      logBillingEvent({
        type: "payment_failed",
        processor: "stripe",
        source: "webhook",
        reason: sub.status,
        accountId: sub.metadata?.userId,
        hasUserId: Boolean(sub.metadata?.userId),
      });
      return Response.json({ received: true, type: event.type, noted: true });
    }
    if (subAction === "ignore") {
      return Response.json({ received: true, type: event.type });
    }
    const result = await fulfillStripeSubscription(sub, {
      source: "webhook",
      setCookie: false,
      plus: subAction !== "revoke",
    });
    return webhookJson(result, event.type);
  }

  if (action === "fail") {
    return Response.json({ received: true, type: event.type, noted: true });
  }

  return Response.json({ received: true, type: event.type });
}
