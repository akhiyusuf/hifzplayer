import { accountsConfigured } from "@/lib/auth/config";
import { registerWithPassword } from "@/lib/auth/password";
import { verifyTurnstileToken } from "@/lib/auth/turnstile";
import { emailLooksValid, json, badRequest, serviceUnavailable, unauthorized } from "@/lib/billing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!accountsConfigured()) {
    return serviceUnavailable("Accounts are not configured yet", { code: "ACCOUNTS_OFF" });
  }
  let body: { email?: string; password?: string; turnstileToken?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return badRequest("Body must be JSON");
  }
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!emailLooksValid(email)) return badRequest("Enter a valid email");
  const human = await verifyTurnstileToken(body.turnstileToken, request.headers);
  if (!human) return unauthorized("Confirm you are human, then try again", { code: "TURNSTILE" });
  const result = await registerWithPassword(email, password);
  if ("error" in result) return badRequest(result.error);
  return json({ ok: true, userId: result.id, name: result.name, email: result.email });
}
