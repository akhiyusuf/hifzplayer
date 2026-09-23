import { assignGiftsToEmails, giftHoldsForBuyer } from "@/lib/auth/gifts";
import { accountsConfigured } from "@/lib/auth/config";
import { signedInEmail, signedInUserId } from "@/lib/auth/session";
import { appUrl } from "@/lib/billing/env";
import {
  fulfillPaystackReference,
  fulfillStripeSession,
  isFulfillGift,
} from "@/lib/billing/fulfill";
import { classifyGiftRecipient, giftRecipientMessage, validateGiftEmails } from "@/lib/billing/gift";
import { badRequest, json, unauthorized } from "@/lib/billing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!accountsConfigured()) return unauthorized("Sign in to send this gift", { code: "SIGN_IN_REQUIRED" });
  const userId = await signedInUserId();
  if (!userId) return unauthorized("Sign in to send this gift", { code: "SIGN_IN_REQUIRED" });

  let body: { sessionId?: string; reference?: string; emails?: string | string[]; email?: string; seats?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return badRequest("Gift body must be JSON");
  }

  const parsed = validateGiftEmails(body.emails || body.email || "", body.seats);
  if ("error" in parsed) return badRequest(parsed.error);
  const buyerEmail = ((await signedInEmail()) || "").toLowerCase();
  for (const email of parsed.emails) {
    if (
      classifyGiftRecipient({
        buyerId: userId,
        buyerEmail,
        recipientEmail: email,
        recipientUserId: null,
      }) === "self"
    ) {
      return badRequest(giftRecipientMessage("self"));
    }
  }

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
  const origin = appUrl(request);
  const hold =
    result && isFulfillGift(result)
      ? result.hold
      : (await giftHoldsForBuyer(userId)).find((row) => row.ref === sessionId || row.ref === reference);
  if (!hold) return badRequest("This payment is not a gift, or it is not ready yet");
  if (hold.buyerId !== userId) return unauthorized("This gift belongs to another account");
  const assigned = await assignGiftsToEmails({
    hold,
    emails: parsed.emails,
    origin,
  });
  const last = assigned[assigned.length - 1];
  return json({
    ok: true,
    gift: true,
    sent: true,
    existingAccount: last?.existingAccount,
    alreadyPlus: last?.alreadyPlus,
    stacked: last?.stacked,
    keptLifetime: last?.keptLifetime,
  });
}
