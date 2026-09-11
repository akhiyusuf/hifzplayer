import { PLUS_NAME } from "@/lib/brand";
import { signedInEmail, signedInUserId } from "@/lib/auth/session";
import { clerkConfigured } from "@/lib/auth/config";
import { logBillingEvent } from "@/lib/billing/analytics";
import { checkoutRegionId } from "@/lib/billing/country";
import { appUrl, processorsReady } from "@/lib/billing/env";
import {
  badRequest,
  emailLooksValid,
  json,
  processorFailed,
  serviceUnavailable,
  unauthorized,
} from "@/lib/billing/http";
import { createPaystackCheckout } from "@/lib/billing/paystack";
import { isPlanId, REGIONS } from "@/lib/billing/plans";
import { createStripeCheckout } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { planId?: string; regionId?: string; email?: string };
  try {
    body = (await request.json()) as { planId?: string; regionId?: string; email?: string };
  } catch {
    return badRequest("Checkout body must be JSON");
  }

  const accountsOn = clerkConfigured();
  const userId = accountsOn ? await signedInUserId() : null;
  if (accountsOn && !userId) {
    return unauthorized(`Sign in to buy ${PLUS_NAME}`, { code: "SIGN_IN_REQUIRED" });
  }

  const planId = body.planId || "";
  if (!isPlanId(planId)) return badRequest("Choose monthly, annual, or lifetime");

  // Region is always detected from the request. Client-supplied regionId is ignored.
  const regionId = checkoutRegionId(request.headers);
  const region = REGIONS[regionId];
  const email = ((await signedInEmail()) || body.email || "").trim().toLowerCase();
  if (!emailLooksValid(email)) return badRequest("A valid email is required for the receipt");

  const ready = processorsReady();
  if (region.processor === "paystack" && !ready.paystack) {
    return serviceUnavailable("Paystack is not configured yet", {
      processor: "paystack",
      code: "PROCESSOR_NOT_CONFIGURED",
    });
  }
  if (region.processor === "stripe" && !ready.stripe) {
    return serviceUnavailable("Stripe is not configured yet", {
      processor: "stripe",
      code: "PROCESSOR_NOT_CONFIGURED",
    });
  }

  logBillingEvent({
    type: "checkout_started",
    processor: region.processor,
    planId,
    regionId,
    source: "checkout",
    hasUserId: Boolean(userId),
  });

  const origin = appUrl(request);
  try {
    if (region.processor === "paystack") {
      const checkout = await createPaystackCheckout({
        region,
        planId,
        email,
        userId: userId || undefined,
        callbackUrl: `${origin}/api/billing/return`,
      });
      return json({ url: checkout.url, reference: checkout.reference, processor: "paystack" });
    }
    const checkout = await createStripeCheckout({
      region,
      planId,
      email,
      userId: userId || undefined,
      successUrl: `${origin}/api/billing/return?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/pricing?canceled=1`,
    });
    return json({ url: checkout.url, sessionId: checkout.id, processor: "stripe" });
  } catch {
    return processorFailed();
  }
}
