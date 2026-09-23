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
  // Always redirect to /welcome after Google sign-in so the user can confirm
  // or set their display name — even if Google returned one.
  const next = safePath(result.next, "/");
  return NextResponse.redirect(
    new URL(`/welcome?next=${encodeURIComponent(next)}`, origin),
  );
}
