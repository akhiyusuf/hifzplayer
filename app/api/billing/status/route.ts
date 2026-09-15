import { clerkConfigured } from "@/lib/auth/config";
import { clerkTrialUsedAt } from "@/lib/auth/plus";
import { resolveEntitlement, signedInUserId } from "@/lib/auth/session";
import { publicEntitlement } from "@/lib/billing/entitlement";
import { processorsReady } from "@/lib/billing/env";
import { json } from "@/lib/billing/http";
import { openTrialUsed, trialAvailable, TRIAL_USED_COOKIE } from "@/lib/billing/trial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ent = await resolveEntitlement();
  const accountsOn = clerkConfigured();
  const userId = accountsOn ? await signedInUserId() : null;
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const cookieUsed = Boolean(openTrialUsed(jar.get(TRIAL_USED_COOKIE)?.value));
  const clerkUsed = userId ? Boolean(await clerkTrialUsedAt(userId)) : false;
  return json({
    ...publicEntitlement(ent),
    processors: processorsReady(),
    trialAvailable: trialAvailable({
      entitlement: ent,
      trialUsed: cookieUsed || clerkUsed,
    }),
  });
}
