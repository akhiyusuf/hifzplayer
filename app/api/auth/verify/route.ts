import { accountsConfigured } from "@/lib/auth/config";
import { verifyEmailOtp } from "@/lib/auth/otp";
import { verifyTurnstileToken } from "@/lib/auth/turnstile";
import { emailLooksValid, json, badRequest, serviceUnavailable, unauthorized } from "@/lib/billing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!accountsConfigured()) {
    return serviceUnavailable("Accounts are not configured yet", { code: "ACCOUNTS_OFF" });
  }
  let body: { email?: string; code?: string; turnstileToken?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return badRequest("Body must be JSON");
  }
  const email = (body.email || "").trim().toLowerCase();
  const code = (body.code || "").trim();
  if (!emailLooksValid(email) || !/^\d{6}$/.test(code)) return badRequest("Enter the 6-digit code");
  if (body.turnstileToken) {
    const human = await verifyTurnstileToken(body.turnstileToken, request.headers);
    if (!human) return unauthorized("Confirm you are human, then try again", { code: "TURNSTILE" });
  }
  const user = await verifyEmailOtp(email, code);
  if (!user) return unauthorized("That code is wrong or expired");
  return json({ ok: true, userId: user.id, name: user.name, email: user.email });
}
