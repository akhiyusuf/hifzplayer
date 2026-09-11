import { checkoutRegionId } from "@/lib/billing/country";
import { processorsReady } from "@/lib/billing/env";
import { json } from "@/lib/billing/http";
import { quote, REGIONS } from "@/lib/billing/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const regionId = checkoutRegionId(request.headers);
  const region = REGIONS[regionId];
  return json({
    region,
    plans: (["monthly", "annual", "lifetime"] as const).map((planId) => quote(regionId, planId)),
    processors: processorsReady(),
  });
}
