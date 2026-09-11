import { publicEntitlement, readEntitlement } from "@/lib/billing/entitlement";
import { processorsReady } from "@/lib/billing/env";
import { json } from "@/lib/billing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ent = await readEntitlement();
  return json({
    ...publicEntitlement(ent),
    processors: processorsReady(),
  });
}
