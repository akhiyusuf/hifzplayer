import { accountsConfigured, accountsBrowserReady } from "@/lib/auth/config";
import { signedInUser } from "@/lib/auth/session";
import { json } from "@/lib/billing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await signedInUser();
  return json({
    accountsOn: accountsConfigured(),
    accountsReady: accountsBrowserReady(),
    signedIn: Boolean(user),
    userId: user?.id || null,
    email: user?.email || "",
    name: user?.name || "",
  });
}
