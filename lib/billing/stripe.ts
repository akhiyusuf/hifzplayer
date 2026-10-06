import Stripe from "stripe";
import { PLUS_NAME } from "@/lib/brand";
import { stripeSecretKey } from "./env";
import type { PaidPlanId, Region } from "./plans";
import { PLANS } from "./plans";

export function stripeClient() {
  const key = stripeSecretKey();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

export async function createStripeCheckout(opts: {
  region: Region;
  planId: PaidPlanId;
  email?: string;
  userId?: string;
  gift?: boolean;
  buyerId?: string;
  seats?: number;
  recipientEmail?: string;
  recipientEmails?: string[];
  recipientUserId?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = stripeClient();
  const plan = PLANS.find((p) => p.id === opts.planId)!;
  const amount = opts.region.amounts[opts.planId];
  const seats = Math.max(1, opts.seats || opts.recipientEmails?.length || 1);
  const emails = opts.recipientEmails?.length
    ? opts.recipientEmails
    : opts.recipientEmail
      ? [opts.recipientEmail]
      : [];
  const productName = opts.gift
    ? seats > 1
      ? `${PLUS_NAME} gift × ${seats} — ${plan.name}`
      : `${PLUS_NAME} gift — ${plan.name}`
    : `${PLUS_NAME} — ${plan.name}`;
  const meta: Record<string, string> = {
    planId: opts.planId,
    regionId: opts.region.id,
    processor: "stripe",
  };
  if (opts.gift) {
    meta.gift = "1";
    meta.seats = String(seats);
    if (opts.buyerId) meta.buyerId = opts.buyerId;
    if (opts.recipientUserId) meta.recipientUserId = opts.recipientUserId;
    if (emails[0]) meta.recipientEmail = emails[0];
    if (emails.length) meta.recipientEmails = emails.join(",");
  } else if (opts.userId) {
    meta.userId = opts.userId;
  }
  const giftOnce = Boolean(opts.gift);
  const session = await stripe.checkout.sessions.create({
    mode: giftOnce || !plan.interval ? "payment" : "subscription",
    customer_email: opts.email || undefined,
    client_reference_id: opts.buyerId || opts.userId || undefined,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    allow_promotion_codes: true,
    metadata: meta,
    line_items: [
      {
        quantity: giftOnce ? seats : 1,
        price_data: {
          currency: opts.region.currency.toLowerCase(),
          unit_amount: amount,
          product_data: {
            name: productName,
            description: opts.gift
              ? "Plus gift. They sign in with the gifted email — they do not need an account yet."
              : plan.blurb,
          },
          ...(plan.interval && !giftOnce ? { recurring: { interval: plan.interval } } : {}),
        },
      },
    ],
    ...(!giftOnce && plan.interval
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
