import { accountsConfigured } from "@/lib/auth/config";
import { startEmailOtp } from "@/lib/auth/otp";
import { verifyTurnstileToken } from "@/lib/auth/turnstile";
import { emailLooksValid, json, badRequest, serviceUnavailable, unauthorized } from "@/lib/billing/http";
import { sendOtpCode } from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!accountsConfigured()) {
    return serviceUnavailable("Accounts are not configured yet", { code: "ACCOUNTS_OFF" });
  }
  let body: { email?: string; turnstileToken?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return badRequest("Body must be JSON");
  }
  const email = (body.email || "").trim().toLowerCase();
  if (!emailLooksValid(email)) return badRequest("Enter a valid email");
  const human = await verifyTurnstileToken(body.turnstileToken, request.headers);
  if (!human) return unauthorized("Confirm you are human, then try again", { code: "TURNSTILE" });

  const started = await startEmailOtp(email);
  if (!started.throttled && started.code) {
    try {
      await sendOtpCode(email, started.code);
    } catch {
      return serviceUnavailable("Could not send the code");
    }
  }
  return json({ ok: true });
}
