import { stripeWebhookSecret } from "@/lib/billing/env";
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

  // Payment is confirmed on the success redirect via `/api/billing/confirm`.
  // This route verifies Stripe signatures so dashboard webhooks can be pointed
  // here before a durable customer store is added.
  return Response.json({ received: true, type: event.type });
}
