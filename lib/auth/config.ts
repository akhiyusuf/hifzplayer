export const SESSION_COOKIE = "diras_sid";
export const OAUTH_COOKIE = "diras_oauth";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_PER_EMAIL_PER_HOUR = 5;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

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

export function googleClientId() {
  return process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
}

export function googleClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET || "";
}

export function googleConfigured() {
  return Boolean(googleClientId() && googleClientSecret());
}

export function passwordLooksValid(password: string) {
  return password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;
}

/** Public signal that the email/password form can render (Turnstile site key). */
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
