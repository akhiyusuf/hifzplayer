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
  return NextResponse.redirect(new URL(safePath(result.next, "/"), origin));
}
