import { countryFromHeaders } from "@/lib/billing/country";
import { appUrl, processorsReady } from "@/lib/billing/env";
import { badRequest, emailLooksValid, json, serviceUnavailable } from "@/lib/billing/http";
import { createPaystackCheckout } from "@/lib/billing/paystack";
import { isPlanId, isRegionId, REGIONS, regionForCountry } from "@/lib/billing/plans";
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

  const planId = body.planId || "";
  if (!isPlanId(planId)) return badRequest("Choose monthly, annual, or lifetime");

  const regionId = body.regionId && isRegionId(body.regionId) ? body.regionId : regionForCountry(countryFromHeaders(request.headers));
  const region = REGIONS[regionId];
  const email = (body.email || "").trim().toLowerCase();
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

  const origin = appUrl(request);
  try {
    if (region.processor === "paystack") {
      const checkout = await createPaystackCheckout({
        region,
        planId,
        email,
        callbackUrl: `${origin}/pricing/success`,
      });
      return json({ url: checkout.url, reference: checkout.reference, processor: "paystack" });
    }
    const checkout = await createStripeCheckout({
      region,
      planId,
      email,
      successUrl: `${origin}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/pricing?canceled=1`,
    });
    return json({ url: checkout.url, sessionId: checkout.id, processor: "stripe" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return json({ error: message, processor: region.processor }, 502);
  }
}
