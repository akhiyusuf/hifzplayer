import { json } from "@/lib/billing/http";
import { handleAsrRequest } from "@/lib/ustadh/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const result = await handleAsrRequest(request);
  return json(result.body, result.status);
}
