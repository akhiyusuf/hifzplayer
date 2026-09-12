import { logBillingEvent } from "@/lib/billing/analytics";
import { stripeWebhookSecret } from "@/lib/billing/env";
import { fulfillStripeSession } from "@/lib/billing/fulfill";
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

  logBillingEvent({ type: "webhook_received", processor: "stripe", source: "webhook", reason: event.type });

  if (event.type === "charge.dispute.created") {
    try {
      const { revokePlusFromStripeDispute } = await import("@/lib/billing/revoke-apply");
      const result = await revokePlusFromStripeDispute(event.data.object);
      return Response.json({ received: true, type: event.type, revoked: result.revoked });
    } catch {
      return Response.json({ received: true, type: event.type, revoked: false }, { status: 500 });
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const result = await fulfillStripeSession(session.id, {
      source: "webhook",
      setCookie: false,
      signedInUserId: null,
    });
    if (!result.ok) {
      return Response.json({ received: true, type: event.type, fulfilled: false }, { status: result.status >= 500 ? 500 : 200 });
    }
    return Response.json({ received: true, type: event.type, fulfilled: true });
  }

  return Response.json({ received: true, type: event.type });
}
