import { cookies } from "next/headers";
import { OAUTH_COOKIE, googleClientId, googleClientSecret, googleConfigured } from "./config.ts";
import { completeSignIn, findOrCreateUser, type AccountUser } from "./otp.ts";
import { randomToken } from "./crypto.ts";
import { sql } from "../db/neon.ts";
import { appUrl } from "@/lib/billing/env";
import { safePath } from "@/lib/nav";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

type OauthCookie = { state: string; next: string };

function callbackUrl(request: Request) {
  return `${appUrl(request)}/api/auth/google/callback`;
}

export function googleRedirectUrl(request: Request, state: string) {
  // App name on Google's consent page is not a URL parameter. Set it to Diras in Google Cloud.
  const params = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: callbackUrl(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function beginGoogleOAuth(request: Request, next: string) {
  if (!googleConfigured()) return null;
  const state = randomToken();
  const jar = await cookies();
  const payload: OauthCookie = { state, next: safePath(next, "/") };
  jar.set(OAUTH_COOKIE, Buffer.from(JSON.stringify(payload)).toString("base64url"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return googleRedirectUrl(request, state);
}

export async function finishGoogleOAuth(
  request: Request,
  code: string,
  state: string,
): Promise<{ user: AccountUser; next: string } | { error: string }> {
  if (!googleConfigured()) return { error: "Google sign-in is not configured yet" };
  const jar = await cookies();
  const raw = jar.get(OAUTH_COOKIE)?.value || "";
  jar.set(OAUTH_COOKIE, "", { path: "/", maxAge: 0 });
  let stored: OauthCookie | null = null;
  try {
    stored = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as OauthCookie;
  } catch {
    stored = null;
  }
  if (!stored?.state || stored.state !== state) return { error: "Google sign-in expired. Try again." };
  const body = new URLSearchParams({
    code,
    client_id: googleClientId(),
    client_secret: googleClientSecret(),
    redirect_uri: callbackUrl(request),
    grant_type: "authorization_code",
  });
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) return { error: "Google sign-in failed" };
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) return { error: "Google sign-in failed" };
  const userRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) return { error: "Google sign-in failed" };
  const profile = (await userRes.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    given_name?: string;
    name?: string;
  };
  const email = (profile.email || "").trim().toLowerCase();
  const sub = (profile.sub || "").trim();
  if (!email || !sub || profile.email_verified === false) {
    return { error: "Google did not share a verified email" };
  }
  const bySub = await sql()`select id, email, name from users where google_sub = ${sub} limit 1`;
  const existing = bySub[0] as { id: string; email: string; name?: string | null } | undefined;
  const user = existing
    ? { id: existing.id, email: existing.email, name: existing.name || profile.given_name || "Reader" }
    : await findOrCreateUser(email, { name: profile.given_name || profile.name, googleSub: sub });
  if (existing && existing.email !== email) {
    /* keep the original email on the account */
  }
  await completeSignIn(user);
  return { user, next: safePath(stored.next, "/") };
}
