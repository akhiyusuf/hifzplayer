import { createHmac, timingSafeEqual } from "node:crypto";
import { paystackSecretKey } from "@/lib/billing/env";

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

  let event: { event?: string };
  try {
    event = JSON.parse(raw) as { event?: string };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  return Response.json({ received: true, type: event.event || "unknown" });
}
