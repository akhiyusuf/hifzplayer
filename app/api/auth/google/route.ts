import { NextResponse } from "next/server";
import { accountsConfigured, googleConfigured } from "@/lib/auth/config";
import { beginGoogleOAuth } from "@/lib/auth/google";
import { appUrl } from "@/lib/billing/env";
import { safePath } from "@/lib/nav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = appUrl(request);
  const next = safePath(new URL(request.url).searchParams.get("redirect_url") || undefined, "/");
  if (!accountsConfigured() || !googleConfigured()) {
    return NextResponse.redirect(new URL(`/sign-in?redirect_url=${encodeURIComponent(next)}`, origin));
  }
  const url = await beginGoogleOAuth(request, next);
  if (!url) {
    return NextResponse.redirect(new URL(`/sign-in?redirect_url=${encodeURIComponent(next)}`, origin));
  }
  return NextResponse.redirect(url);
}
