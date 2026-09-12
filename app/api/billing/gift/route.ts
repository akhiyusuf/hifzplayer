import { assignGiftToEmail, giftHoldsForBuyer } from "@/lib/auth/gifts";
import { clerkConfigured } from "@/lib/auth/config";
import { signedInUserId } from "@/lib/auth/session";
import { appUrl } from "@/lib/billing/env";
import {
  fulfillPaystackReference,
  fulfillStripeSession,
  isFulfillGift,
} from "@/lib/billing/fulfill";
import { validateGiftEmails } from "@/lib/billing/gift";
import { badRequest, json, unauthorized } from "@/lib/billing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!clerkConfigured()) return unauthorized("Sign in to send this gift", { code: "SIGN_IN_REQUIRED" });
  const userId = await signedInUserId();
  if (!userId) return unauthorized("Sign in to send this gift", { code: "SIGN_IN_REQUIRED" });

  let body: { sessionId?: string; reference?: string; emails?: string | string[]; email?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return badRequest("Gift body must be JSON");
  }

  const parsed = validateGiftEmails(body.emails || body.email || "");
  if ("error" in parsed) return badRequest(parsed.error);

  const sessionId = (body.sessionId || "").trim();
  const reference = (body.reference || "").trim();
  const result = sessionId
    ? await fulfillStripeSession(sessionId, { source: "confirm", setCookie: false, signedInUserId: userId })
    : reference
      ? await fulfillPaystackReference(reference, {
          source: "confirm",
          setCookie: false,
          signedInUserId: userId,
        })
      : null;
  if (!result || !isFulfillGift(result)) {
    const holds = await giftHoldsForBuyer(userId);
    const hold = holds.find((row) => row.ref === sessionId || row.ref === reference);
    if (!hold) return badRequest("This payment is not a gift, or it is not ready yet");
    if (hold.buyerId !== userId) return unauthorized("This gift belongs to another account");
    const assigned = await assignGiftToEmail({
      hold,
      email: parsed.emails[0],
      origin: appUrl(request),
    });
    return json({ ok: true, gift: true, sent: true, existingAccount: assigned.existingAccount });
  }
  if (result.hold.buyerId !== userId) {
    return unauthorized("This gift belongs to another account");
  }
  const assigned = await assignGiftToEmail({
    hold: result.hold,
    email: parsed.emails[0],
    origin: appUrl(request),
  });
  return json({ ok: true, gift: true, sent: true, existingAccount: assigned.existingAccount });
}
