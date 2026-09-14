import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { claimGiftForUser } from "@/lib/auth/gifts";
import { saveLegalAccept } from "@/lib/auth/legal";
import { logOpsEvent } from "@/lib/ops/events";
import { isLegalCurrent, parseLegalAccept } from "@/lib/legal";

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
    const raw = event.data as { unsafe_metadata?: unknown; unsafeMetadata?: unknown };
    const hint = parseLegalAccept(raw.unsafe_metadata ?? raw.unsafeMetadata);
    if (hint && isLegalCurrent(hint)) {
      try {
        await saveLegalAccept(event.data.id, hint);
      } catch {
        /* /agree still records it */
      }
    }
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
