import { fulfillJson, fulfillPaystackReference, fulfillStripeSession } from "@/lib/billing/fulfill";
import { badRequest } from "@/lib/billing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return confirm({
    sessionId: url.searchParams.get("session_id") || "",
    reference: url.searchParams.get("reference") || url.searchParams.get("trxref") || "",
  });
}

export async function POST(request: Request) {
  let body: { sessionId?: string; session_id?: string; reference?: string; trxref?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  const url = new URL(request.url);
  return confirm({
    sessionId: body.sessionId || body.session_id || url.searchParams.get("session_id") || "",
    reference:
      body.reference || body.trxref || url.searchParams.get("reference") || url.searchParams.get("trxref") || "",
  });
}

async function confirm(opts: { sessionId: string; reference: string }) {
  if (opts.sessionId) {
    return fulfillJson(await fulfillStripeSession(opts.sessionId, { source: "confirm", setCookie: true }));
  }
  if (opts.reference) {
    return fulfillJson(await fulfillPaystackReference(opts.reference, { source: "confirm", setCookie: true }));
  }
  return badRequest("Missing session_id or reference");
}
