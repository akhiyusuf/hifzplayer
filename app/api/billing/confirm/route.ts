import { grantFromPayment, periodEnd, publicEntitlement, writeEntitlement } from "@/lib/billing/entitlement";
import { badRequest, json } from "@/lib/billing/http";
import { verifyPaystackReference } from "@/lib/billing/paystack";
import { isPlanId, isRegionId, quote } from "@/lib/billing/plans";
import { retrieveStripeSession } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return confirm({
    sessionId: url.searchParams.get("session_id") || "",
    reference: url.searchParams.get("reference") || url.searchParams.get("trxref") || "",
  });
}

export async function POST(request: Request) {
  let body: { sessionId?: string; session_id?: string; reference?: string; trxref?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  const url = new URL(request.url);
  return confirm({
    sessionId: body.sessionId || body.session_id || url.searchParams.get("session_id") || "",
    reference: body.reference || body.trxref || url.searchParams.get("reference") || url.searchParams.get("trxref") || "",
  });
}

async function confirm(opts: { sessionId: string; reference: string }) {
  if (opts.sessionId) return confirmStripe(opts.sessionId);
  if (opts.reference) return confirmPaystack(opts.reference);
  return badRequest("Missing session_id or reference");
}

async function confirmStripe(sessionId: string) {
  let session;
  try {
    session = await retrieveStripeSession(sessionId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load Stripe session";
    return json({ error: message }, 502);
  }
  const paid = session.payment_status === "paid" || session.status === "complete";
  if (!paid) return json({ error: "Payment is not complete yet", plus: false }, 402);

  const planId = session.metadata?.planId || "";
  const regionId = session.metadata?.regionId || "";
  if (!isPlanId(planId) || !isRegionId(regionId)) {
    return json({ error: "Checkout session is missing plan metadata" }, 400);
  }
  const expected = quote(regionId, planId);
  if (session.amount_total != null && session.amount_total !== expected.amount) {
    return json({ error: "Paid amount does not match the catalog" }, 409);
  }
  if (session.currency && session.currency.toLowerCase() !== expected.currency.toLowerCase()) {
    return json({ error: "Paid currency does not match the catalog" }, 409);
  }

  let until = periodEnd(planId);
  const sub = session.subscription;
  if (planId !== "lifetime" && sub && typeof sub !== "string") {
    const end = sub.items?.data?.[0]?.current_period_end;
    if (typeof end === "number" && end > 0) until = new Date(end * 1000).toISOString();
  }
  const ent = grantFromPayment({
    planId,
    regionId,
    processor: "stripe",
    email: session.customer_details?.email || session.customer_email || undefined,
    ref: session.id,
    until,
  });
  await writeEntitlement(ent);
  return json({ ok: true, ...publicEntitlement(ent) });
}

async function confirmPaystack(reference: string) {
  let verified;
  try {
    verified = await verifyPaystackReference(reference);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not verify Paystack payment";
    return json({ error: message }, 502);
  }
  const data = verified.data;
  if (data.status !== "success") return json({ error: "Payment is not complete yet", plus: false }, 402);

  const planId = data.metadata?.planId || "";
  const regionId = data.metadata?.regionId || "";
  if (!isPlanId(planId) || !isRegionId(regionId)) {
    return json({ error: "Payment is missing plan metadata" }, 400);
  }
  const expected = quote(regionId, planId);
  if (data.amount !== expected.amount || data.currency.toUpperCase() !== expected.currency) {
    return json({ error: "Paid amount does not match the catalog" }, 409);
  }

  const ent = grantFromPayment({
    planId,
    regionId,
    processor: "paystack",
    email: data.customer?.email,
    ref: data.reference,
  });
  await writeEntitlement(ent);
  return json({ ok: true, ...publicEntitlement(ent) });
}
