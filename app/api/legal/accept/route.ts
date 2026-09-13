import { clerkConfigured } from "@/lib/auth/config";
import { saveLegalAccept } from "@/lib/auth/legal";
import { signedInUserId } from "@/lib/auth/session";
import { badRequest, json, unauthorized } from "@/lib/billing/http";
import { currentLegalAccept, publicLegal } from "@/lib/legal";
import { logOpsEvent } from "@/lib/ops/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!clerkConfigured()) return unauthorized("Sign in to agree", { code: "SIGN_IN_REQUIRED" });
  const userId = await signedInUserId();
  if (!userId) return unauthorized("Sign in to agree", { code: "SIGN_IN_REQUIRED" });

  let body: { terms?: unknown; privacy?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  if (body.terms !== true || body.privacy !== true) {
    return badRequest("Agree to both the usage policy and the privacy policy");
  }

  const accept = currentLegalAccept();
  try {
    await saveLegalAccept(userId, accept);
  } catch {
    logOpsEvent({ type: "legal_accepted", accountId: userId, ok: false });
    return json({ error: "Could not save your agreement." }, 502);
  }
  logOpsEvent({ type: "legal_accepted", accountId: userId, ok: true });
  return json({ ok: true, ...publicLegal(accept) });
}
