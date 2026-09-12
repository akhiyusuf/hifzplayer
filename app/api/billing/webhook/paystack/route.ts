import { createHmac, timingSafeEqual } from "node:crypto";
import { logBillingEvent } from "@/lib/billing/analytics";
import { paystackSecretKey } from "@/lib/billing/env";
import { fulfillPaystackReference } from "@/lib/billing/fulfill";

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

  let event: { event?: string; data?: unknown };
  try {
    event = JSON.parse(raw) as { event?: string; data?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = event.event || "unknown";
  logBillingEvent({ type: "webhook_received", processor: "paystack", source: "webhook", reason: type });

  if (type === "charge.dispute.create") {
    try {
      const { revokePlusFromPaystackDispute } = await import("@/lib/billing/revoke-apply");
      const result = await revokePlusFromPaystackDispute(event.data);
      return Response.json({ received: true, type, revoked: result.revoked });
    } catch {
      return Response.json({ received: true, type, revoked: false }, { status: 500 });
    }
  }

  if (type === "charge.success") {
    const reference =
      event.data && typeof event.data === "object" && "reference" in event.data
        ? String((event.data as { reference?: string }).reference || "")
        : "";
    const result = await fulfillPaystackReference(reference, {
      source: "webhook",
      setCookie: false,
      signedInUserId: null,
    });
    if (!result.ok) {
      return Response.json({ received: true, type, fulfilled: false }, { status: result.status >= 500 ? 500 : 200 });
    }
    return Response.json({ received: true, type, fulfilled: true });
  }

  return Response.json({ received: true, type });
}
