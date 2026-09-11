import { NextResponse } from "next/server";
import { attachEntitlementCookie } from "@/lib/billing/entitlement";
import { appUrl } from "@/lib/billing/env";
import { fulfillPaystackReference, fulfillStripeSession } from "@/lib/billing/fulfill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paystack/Stripe send the customer here as a top-level GET after payment.
 * Grant Plus on this response (cookie + Clerk), then redirect to the success page.
 * That way Plus is not lost if the success page JS never runs.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id") || "";
  const reference = url.searchParams.get("reference") || url.searchParams.get("trxref") || "";
  const origin = appUrl(request);
  const dest = new URL("/pricing/success", origin);

  const result = sessionId
    ? await fulfillStripeSession(sessionId, { source: "return", setCookie: false })
    : reference
      ? await fulfillPaystackReference(reference, { source: "return", setCookie: false })
      : null;

  if (result?.ok) {
    dest.searchParams.set("granted", "1");
    dest.searchParams.set("plan", result.entitlement.planId);
    const res = NextResponse.redirect(dest);
    attachEntitlementCookie(res, result.entitlement);
    return res;
  }

  if (sessionId) dest.searchParams.set("session_id", sessionId);
  if (reference) dest.searchParams.set("reference", reference);
  dest.searchParams.set("error", "1");
  return NextResponse.redirect(dest);
}
