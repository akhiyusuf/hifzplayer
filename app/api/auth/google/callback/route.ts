import { NextResponse } from "next/server";
import { finishGoogleOAuth } from "@/lib/auth/google";
import { appUrl } from "@/lib/billing/env";
import { safePath } from "@/lib/nav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = appUrl(request);
  const url = new URL(request.url);
  const err = url.searchParams.get("error");
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  if (err || !code || !state) {
    return NextResponse.redirect(new URL("/sign-in?error=google", origin));
  }
  const result = await finishGoogleOAuth(request, code, state);
  if ("error" in result) {
    return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(result.error)}`, origin));
  }
  // If the user signed in via Google but has no name (or the name is the
  // fallback "Reader"), redirect to a name-collection page so they can set
  // their display name. The page sends them to their intended destination
  // after they enter (or skip) the name.
  const userName = (result.user.name || "").trim();
  if (!userName || userName === "Reader") {
    const next = safePath(result.next, "/");
    return NextResponse.redirect(
      new URL(`/welcome?next=${encodeURIComponent(next)}`, origin),
    );
  }
  return NextResponse.redirect(new URL(safePath(result.next, "/"), origin));
}
