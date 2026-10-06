import { accountsConfigured } from "@/lib/auth/config";
import { registerWithPassword, sendRegistrationCode } from "@/lib/auth/password";
import { verifyTurnstileToken } from "@/lib/auth/turnstile";
import { emailLooksValid, json, badRequest, serviceUnavailable, unauthorized } from "@/lib/billing/http";
import { sendOtpCode } from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!accountsConfigured()) {
    return serviceUnavailable("Accounts are not configured yet", { code: "ACCOUNTS_OFF" });
  }
  let body: { email?: string; password?: string; name?: string; turnstileToken?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return badRequest("Body must be JSON");
  }
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const name = body.name || "";
  if (!emailLooksValid(email)) return badRequest("Enter a valid email");
  const human = await verifyTurnstileToken(body.turnstileToken, request.headers);
  if (!human) return unauthorized("Confirm you are human, then try again", { code: "TURNSTILE" });
  const result = await registerWithPassword(email, password, name);
  if ("error" in result) return badRequest(result.error);

  // Send a 6-digit verification code to the email. The user must enter it
  // on /verify before they can sign in. This proves they own the email.
  const started = await sendRegistrationCode(email);
  if (started.throttled) {
    return json({
      ok: true,
      verifyRequired: true,
      email,
      throttled: true,
      message: "We sent too many codes to this email. Try again in an hour.",
    });
  }
  if (started.code) {
    try {
      await sendOtpCode(email, started.code);
    } catch {
      // Email failure should never block account creation — but the user
      // won't get a code. Tell them to try again.
      return serviceUnavailable("Could not send the verification code. Try again.");
    }
  }

  return json({
    ok: true,
    verifyRequired: true,
    email,
    message: `We sent a 6-digit code to ${email}. Enter it to finish creating your account.`,
  });
}
