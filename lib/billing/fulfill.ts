import { NextResponse } from "next/server";
import { PLUS_NAME } from "@/lib/brand";
import { clerkConfigured } from "@/lib/auth/config";
import { grantPlusToAccount, signedInUserId } from "@/lib/auth/session";
import { logBillingEvent, type BillingEvent } from "./analytics";
import { grantFromPayment, periodEnd, publicEntitlement, type Entitlement } from "./entitlement";
import { resolvePaidPlan } from "./match";
import { verifyPaystackReference } from "./paystack";
import { retrieveStripeSession } from "./stripe";

export type FulfillSource = "confirm" | "return" | "webhook";

export type FulfillOk = { ok: true; entitlement: Entitlement };
export type FulfillErr = { ok: false; status: number; error: string };
export type FulfillResult = FulfillOk | FulfillErr;

function fail(status: number, error: string, extra?: Omit<Partial<BillingEvent>, "type">): FulfillErr {
  logBillingEvent({
    type: "confirm_failed",
    ok: false,
    reason: error,
    ...extra,
  });
  return { ok: false, status, error };
}

function isFulfillErr(value: { userId: string | null } | FulfillErr): value is FulfillErr {
  return "ok" in value && value.ok === false;
}

function ownerForGrant(opts: {
  source: FulfillSource;
  metadataUserId?: string;
  signedInUserId: string | null;
  accountsOn: boolean;
}): { userId: string | null } | FulfillErr {
  const meta = opts.metadataUserId || "";
  const signedIn = opts.signedInUserId;

  if (opts.source === "webhook") {
    return { userId: meta || null };
  }

  if (opts.accountsOn && meta && signedIn && meta !== signedIn) {
    return fail(403, `This payment is for another account. Sign in with the account you used at checkout.`, {
      source: opts.source,
      hasUserId: true,
    });
  }

  if (opts.accountsOn && opts.source === "confirm" && !signedIn && !meta) {
    return fail(401, `Sign in to attach ${PLUS_NAME} to your account`, {
      source: opts.source,
      hasUserId: false,
    });
  }

  return { userId: meta || signedIn || null };
}

async function persist(ent: Entitlement, userId: string | null, setCookie: boolean, source: FulfillSource) {
  if (!setCookie && !userId) {
    logBillingEvent({
      type: "webhook_received",
      processor: ent.processor,
      planId: ent.planId,
      regionId: ent.regionId,
      source,
      hasUserId: false,
      reason: "no_account_to_grant",
    });
    return ent;
  }
  const next = await grantPlusToAccount(ent, userId, { setCookie });
  logBillingEvent({
    type: "granted",
    ok: true,
    processor: next.processor,
    planId: next.planId,
    regionId: next.regionId,
    source,
    hasUserId: Boolean(next.userId),
  });
  return next;
}

export async function fulfillPaystackReference(
  reference: string,
  opts: { source: FulfillSource; setCookie: boolean; signedInUserId?: string | null },
): Promise<FulfillResult> {
  const ref = reference.trim();
  if (!ref) return fail(400, "Missing payment reference", { processor: "paystack", source: opts.source });

  let verified;
  try {
    verified = await verifyPaystackReference(ref);
  } catch {
    return fail(502, "Could not reach the payment provider", { processor: "paystack", source: opts.source });
  }

  const data = verified.data;
  if (data.status !== "success") {
    return fail(402, "Payment is not complete yet", { processor: "paystack", source: opts.source });
  }

  const paid = resolvePaidPlan({
    amount: data.amount,
    currency: data.currency,
    metadata: data.metadata,
  });
  if ("error" in paid) {
    return fail(paid.error.includes("amount") ? 409 : 400, paid.error, {
      processor: "paystack",
      source: opts.source,
    });
  }

  const accountsOn = clerkConfigured();
  const signedIn = opts.signedInUserId === undefined ? await signedInUserId() : opts.signedInUserId;
  const owner = ownerForGrant({
    source: opts.source,
    metadataUserId: paid.userId,
    signedInUserId: signedIn,
    accountsOn,
  });
  if (isFulfillErr(owner)) return owner;

  const ent = grantFromPayment({
    planId: paid.planId,
    regionId: paid.regionId,
    processor: "paystack",
    email: data.customer?.email,
    userId: owner.userId || undefined,
    ref: data.reference,
  });
  const next = await persist(ent, owner.userId, opts.setCookie, opts.source);
  return { ok: true, entitlement: next };
}

export async function fulfillStripeSession(
  sessionId: string,
  opts: { source: FulfillSource; setCookie: boolean; signedInUserId?: string | null },
): Promise<FulfillResult> {
  const id = sessionId.trim();
  if (!id) return fail(400, "Missing checkout session", { processor: "stripe", source: opts.source });

  let session;
  try {
    session = await retrieveStripeSession(id);
  } catch {
    return fail(502, "Could not reach the payment provider", { processor: "stripe", source: opts.source });
  }

  const paid = session.payment_status === "paid" || session.status === "complete";
  if (!paid) {
    return fail(402, "Payment is not complete yet", { processor: "stripe", source: opts.source });
  }

  const resolved = resolvePaidPlan({
    amount: session.amount_total ?? -1,
    currency: session.currency || "",
    metadata: session.metadata,
  });
  if ("error" in resolved) {
    return fail(resolved.error.includes("amount") ? 409 : 400, resolved.error, {
      processor: "stripe",
      source: opts.source,
    });
  }

  let until = periodEnd(resolved.planId);
  const sub = session.subscription;
  if (resolved.planId !== "lifetime" && sub && typeof sub !== "string") {
    const end = sub.items?.data?.[0]?.current_period_end;
    if (typeof end === "number" && end > 0) until = new Date(end * 1000).toISOString();
  }

  const accountsOn = clerkConfigured();
  const signedIn = opts.signedInUserId === undefined ? await signedInUserId() : opts.signedInUserId;
  const metaUser = session.metadata?.userId || resolved.userId;
  const owner = ownerForGrant({
    source: opts.source,
    metadataUserId: metaUser,
    signedInUserId: signedIn,
    accountsOn,
  });
  if (isFulfillErr(owner)) return owner;

  const ent = grantFromPayment({
    planId: resolved.planId,
    regionId: resolved.regionId,
    processor: "stripe",
    email: session.customer_details?.email || session.customer_email || undefined,
    userId: owner.userId || undefined,
    ref: session.id,
    until,
  });
  const next = await persist(ent, owner.userId, opts.setCookie, opts.source);
  return { ok: true, entitlement: next };
}

export function fulfillJson(result: FulfillResult) {
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, plus: false },
      { status: result.status },
    );
  }
  return NextResponse.json({ ok: true, ...publicEntitlement(result.entitlement) });
}
