import { accountsConfigured } from "@/lib/auth/config";
import { updateDisplayName } from "@/lib/auth/password";
import { signedInUserId } from "@/lib/auth/session";
import { json, badRequest, serviceUnavailable, unauthorized } from "@/lib/billing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!accountsConfigured()) {
    return serviceUnavailable("Accounts are not configured yet", { code: "ACCOUNTS_OFF" });
  }
  const userId = await signedInUserId();
  if (!userId) return unauthorized("Sign in to update your name");

  let body: { name?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return badRequest("Body must be JSON");
  }

  const name = (body.name || "").trim();
  if (!name) return badRequest("Enter a name");
  if (name.length > 50) return badRequest("Name is too long (50 characters max)");

  const result = await updateDisplayName(userId, name);
  if (!result.ok) return badRequest("Could not update name");
  return json({ ok: true, name: result.name });
}
