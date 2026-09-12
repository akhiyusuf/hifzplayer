import Stripe from "stripe";
import { PLUS_NAME } from "@/lib/brand";
import { stripeSecretKey } from "./env";
import type { PlanId, Region } from "./plans";
import { PLANS } from "./plans";

export function stripeClient() {
  const key = stripeSecretKey();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

export async function createStripeCheckout(opts: {
  region: Region;
  planId: PlanId;
  email?: string;
  userId?: string;
  gift?: boolean;
  buyerId?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = stripeClient();
  const plan = PLANS.find((p) => p.id === opts.planId)!;
  const amount = opts.region.amounts[opts.planId];
  const productName = opts.gift ? `${PLUS_NAME} gift — ${plan.name}` : `${PLUS_NAME} — ${plan.name}`;
  const meta: Record<string, string> = {
    planId: opts.planId,
    regionId: opts.region.id,
    processor: "stripe",
  };
  if (opts.gift) {
    meta.gift = "1";
    meta.seats = "1";
    if (opts.buyerId) meta.buyerId = opts.buyerId;
  } else if (opts.userId) {
    meta.userId = opts.userId;
  }
  const session = await stripe.checkout.sessions.create({
    mode: plan.interval ? "subscription" : "payment",
    customer_email: opts.email || undefined,
    client_reference_id: opts.buyerId || opts.userId || undefined,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    allow_promotion_codes: true,
    metadata: meta,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: opts.region.currency.toLowerCase(),
          unit_amount: amount,
          product_data: {
            name: productName,
            description: opts.gift
              ? "Gifted after you pay. Add their email on the next screen."
              : plan.blurb,
          },
          ...(plan.interval ? { recurring: { interval: plan.interval } } : {}),
        },
      },
    ],
    ...(plan.interval
      ? {
          subscription_data: {
            metadata: meta,
          },
        }
      : {
          payment_intent_data: {
            metadata: meta,
          },
        }),
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { id: session.id, url: session.url };
}

export async function retrieveStripeSession(id: string) {
  const stripe = stripeClient();
  return stripe.checkout.sessions.retrieve(id, { expand: ["subscription"] });
}

export async function retrieveStripeSubscription(id: string) {
  const stripe = stripeClient();
  return stripe.subscriptions.retrieve(id);
}
