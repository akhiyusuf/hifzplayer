import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { claimGiftForUser } from "@/lib/auth/gifts";
import { logOpsEvent } from "@/lib/ops/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(request);
  } catch {
    return Response.json({ error: "Invalid Clerk signature" }, { status: 400 });
  }

  if (event.type === "user.created") {
    logOpsEvent({
      type: "user_created",
      accountId: event.data.id,
      ok: true,
    });
    const emails = (event.data.email_addresses || [])
      .map((row) => (row.email_address || "").trim().toLowerCase())
      .filter(Boolean);
    try {
      await claimGiftForUser({
        userId: event.data.id,
        emails,
        publicMetadata: event.data.public_metadata,
      });
    } catch {
      logOpsEvent({ type: "user_created", accountId: event.data.id, ok: false });
    }
    return Response.json({ received: true, type: event.type });
  }

  if (event.type === "session.created") {
    const userId = event.data.user_id;
    if (userId) {
      logOpsEvent({
        type: "user_signed_in",
        accountId: userId,
        ok: true,
      });
      try {
        await claimGiftForUser({ userId });
      } catch {
        /* sign-in still succeeds */
      }
    }
    return Response.json({ received: true, type: event.type });
  }

  return Response.json({ received: true, type: event.type });
}
