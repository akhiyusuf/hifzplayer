import Stripe from "stripe";
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
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = stripeClient();
  const plan = PLANS.find((p) => p.id === opts.planId)!;
  const amount = opts.region.amounts[opts.planId];
  const productName = `Hifz Plus — ${plan.name}`;
  const session = await stripe.checkout.sessions.create({
    mode: plan.interval ? "subscription" : "payment",
    customer_email: opts.email || undefined,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      planId: opts.planId,
      regionId: opts.region.id,
      processor: "stripe",
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: opts.region.currency.toLowerCase(),
          unit_amount: amount,
          product_data: {
            name: productName,
            description: plan.blurb,
          },
          ...(plan.interval ? { recurring: { interval: plan.interval } } : {}),
        },
      },
    ],
    ...(plan.interval
      ? {
          subscription_data: {
            metadata: { planId: opts.planId, regionId: opts.region.id },
          },
        }
      : {
          payment_intent_data: {
            metadata: { planId: opts.planId, regionId: opts.region.id },
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
