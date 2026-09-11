import { processorsReady } from "@/lib/billing/env";
import { json } from "@/lib/billing/http";
import { catalog, isRegionId, quote, REGIONS, REGION_IDS } from "@/lib/billing/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const regionParam = new URL(request.url).searchParams.get("region");
  const ready = processorsReady();
  if (regionParam) {
    if (!isRegionId(regionParam)) return json({ error: "Unknown region" }, 400);
    const region = REGIONS[regionParam];
    return json({
      region,
      plans: (["monthly", "annual", "lifetime"] as const).map((planId) => quote(regionParam, planId)),
      processors: ready,
    });
  }
  return json({
    regions: REGION_IDS,
    catalog: catalog(),
    processors: ready,
  });
}
