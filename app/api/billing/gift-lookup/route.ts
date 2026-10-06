import { resolveGiftRecipients } from "@/lib/auth/gifts";
import { accountsConfigured } from "@/lib/auth/config";
import { signedInEmail, signedInUserId } from "@/lib/auth/session";
import { PLUS_NAME } from "@/lib/brand";
import { badRequest, json, unauthorized } from "@/lib/billing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!accountsConfigured()) return unauthorized(`Sign in to gift ${PLUS_NAME}`, { code: "SIGN_IN_REQUIRED" });
  const userId = await signedInUserId();
  if (!userId) return unauthorized(`Sign in to gift ${PLUS_NAME}`, { code: "SIGN_IN_REQUIRED" });

  let body: { email?: string; emails?: string | string[]; seats?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return badRequest("Lookup body must be JSON");
  }

  const looked = await resolveGiftRecipients({
    emails: body.emails || body.email || "",
    buyerId: userId,
    buyerEmail: (await signedInEmail()) || "",
    seats: body.seats,
  });
  if ("error" in looked) return badRequest(looked.error);
  return json({
    ok: true,
    recipients: looked.recipients.map((row) => ({
      existingAccount: row.existingAccount,
    })),
  });
}
