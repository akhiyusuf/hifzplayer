import { createHmac, timingSafeEqual } from "node:crypto";
import { logBillingEvent } from "@/lib/billing/analytics";
import { paystackSecretKey } from "@/lib/billing/env";
import {
  fulfillPaystackReference,
  fulfillPaystackSubscriptionEvent,
  webhookJson,
} from "@/lib/billing/fulfill";
import { paystackWebhookAction } from "@/lib/billing/webhook-kind";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function signaturesMatch(raw: string, signature: string, secret: string) {
  const expected = createHmac("sha512", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = paystackSecretKey();
  if (!secret) {
    return Response.json({ error: "PAYSTACK_SECRET_KEY is not set" }, { status: 503 });
  }
  const signature = request.headers.get("x-paystack-signature") || "";
  const raw = await request.text();
  if (!signature || !signaturesMatch(raw, signature, secret)) {
    return Response.json({ error: "Invalid Paystack signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    data?: {
      reference?: string;
      status?: string;
      subscription_code?: string;
      next_payment_date?: string;
      customer?: { email?: string };
      metadata?: unknown;
      plan?: unknown;
    };
  };
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = event.event || "unknown";
  const action = paystackWebhookAction(type);
  logBillingEvent({
    type: action === "fail" ? "payment_failed" : "webhook_received",
    processor: "paystack",
    source: "webhook",
    reason: type,
    ok: action !== "fail",
  });

  if (type === "charge.dispute.create") {
    try {
      const { revokePlusFromPaystackDispute } = await import("@/lib/billing/revoke-apply");
      const result = await revokePlusFromPaystackDispute(event.data);
      return Response.json({ received: true, type, revoked: result.revoked });
    } catch {
      return Response.json({ received: true, type, revoked: false }, { status: 500 });
    }
  }

  if (action === "checkout") {
    const reference = event.data?.reference || "";
    const result = await fulfillPaystackReference(reference, {
      source: "webhook",
      setCookie: false,
      signedInUserId: null,
    });
    return webhookJson(result, type);
  }

  if (action === "revoke") {
    const result = await fulfillPaystackSubscriptionEvent(event.data || {}, {
      source: "webhook",
      setCookie: false,
      plus: false,
    });
    return webhookJson(result, type);
  }

  if (action === "fail") {
    return Response.json({ received: true, type, noted: true });
  }

  return Response.json({ received: true, type });
}
