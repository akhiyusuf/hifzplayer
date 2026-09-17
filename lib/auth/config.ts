export const SESSION_COOKIE = "diras_sid";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_PER_EMAIL_PER_HOUR = 5;

export function authSecret() {
  return process.env.AUTH_SECRET || process.env.BILLING_SIGNING_SECRET || "";
}

export function turnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
}

export function turnstileSecretKey() {
  return process.env.TURNSTILE_SECRET_KEY || "";
}

/** Neon + signing secret. Webhooks and grants can run with this even before Turnstile is on. */
export function accountsConfigured() {
  const db = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "";
  return Boolean(db) && Boolean(authSecret());
}

/** Public signal that the email-code form can render (Turnstile site key). */
export function accountsBrowserReady() {
  return Boolean(turnstileSiteKey());
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function clearSessionCookieOptions() {
  return { ...sessionCookieOptions(), maxAge: 0 };
}
