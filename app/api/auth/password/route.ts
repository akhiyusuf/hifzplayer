import { accountsConfigured } from "@/lib/auth/config";
import { resetPasswordWithOtp } from "@/lib/auth/password";
import { verifyTurnstileToken } from "@/lib/auth/turnstile";
import { emailLooksValid, json, badRequest, serviceUnavailable, unauthorized } from "@/lib/billing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!accountsConfigured()) {
    return serviceUnavailable("Accounts are not configured yet", { code: "ACCOUNTS_OFF" });
  }
  let body: { email?: string; code?: string; password?: string; turnstileToken?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return badRequest("Body must be JSON");
  }
  const email = (body.email || "").trim().toLowerCase();
  const code = (body.code || "").trim();
  const password = body.password || "";
  if (!emailLooksValid(email) || !/^\d{6}$/.test(code)) return badRequest("Enter the 6-digit code");
  if (body.turnstileToken) {
    const human = await verifyTurnstileToken(body.turnstileToken, request.headers);
    if (!human) return unauthorized("Confirm you are human, then try again", { code: "TURNSTILE" });
  }
  const result = await resetPasswordWithOtp(email, code, password);
  if ("error" in result) return unauthorized(result.error);
  return json({ ok: true, userId: result.id, name: result.name, email: result.email });
}
