import { PASSWORD_MAX, PASSWORD_MIN, accountsConfigured, passwordLooksValid } from "./config.ts";
import { hashPassword, randomId, verifyPassword } from "./crypto.ts";
import { completeSignIn, consumeEmailOtp, startEmailOtp, type AccountUser } from "./otp.ts";
import { sql } from "../db/neon.ts";
import { logOpsEvent } from "@/lib/ops/events";

function displayName(email: string, stored?: string | null) {
  if (stored?.trim()) return stored.trim().split(/\s+/)[0] || stored.trim();
  const local = email.split("@")[0] || "";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  return cleaned ? cleaned.split(/\s+/)[0] : "Reader";
}

/**
 * Create a new password account. Does NOT sign the user in — the caller must
 * call verifyRegistrationCode() after the user enters the 6-digit code we send.
 * Returns the user id + email so the caller can send a verification code.
 */
export async function registerWithPassword(
  email: string,
  password: string,
): Promise<AccountUser | { error: string }> {
  if (!accountsConfigured()) return { error: "Accounts are not configured yet" };
  if (!passwordLooksValid(password)) return { error: `Password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters` };
  const address = email.trim().toLowerCase();
  const existing = await sql()`select id, password_hash, google_sub from users where email = ${address} limit 1`;
  const row = existing[0] as { id?: string; password_hash?: string | null; google_sub?: string | null } | undefined;
  if (row?.id) {
    if (row.google_sub && !row.password_hash) {
      return { error: "This email uses Google. Continue with Google." };
    }
    return { error: "An account already exists for this email. Sign in." };
  }
  const id = randomId("usr");
  const name = displayName(address);
  await sql()`
    insert into users (id, email, name, password_hash)
    values (${id}, ${address}, ${name}, ${await hashPassword(password)})
  `;
  logOpsEvent({ type: "user_created", accountId: id, ok: true });
  // Do NOT call completeSignIn — the user must verify their email first.
  return { id, email: address, name, created: true };
}

/**
 * Verify the 6-digit code sent during sign-up, then sign the user in.
 * Returns the signed-in user, or { error } if the code is wrong/expired.
 */
export async function verifyRegistrationCode(
  email: string,
  code: string,
): Promise<AccountUser | { error: string }> {
  const address = email.trim().toLowerCase();
  if (!(await consumeEmailOtp(address, code))) {
    return { error: "That code is wrong or expired" };
  }
  const rows = await sql()`select id, email, name from users where email = ${address} limit 1`;
  const row = rows[0] as { id: string; email: string; name?: string | null } | undefined;
  if (!row) return { error: "Create an account first" };
  const user = { id: row.id, email: row.email, name: displayName(row.email, row.name) };
  await completeSignIn(user);
  return user;
}

/**
 * Send a 6-digit verification code to a freshly-registered email.
 * Reuses the OTP infrastructure (throttling, hashing, expiry).
 * Returns the code so the caller can email it — the code is NOT returned
 * to the client, only sent via email.
 */
export async function sendRegistrationCode(
  email: string,
): Promise<{ ok: boolean; throttled: boolean; code?: string }> {
  const started = await startEmailOtp(email);
  return { ok: started.ok, throttled: started.throttled, code: "code" in started ? started.code : undefined };
}

export async function signInWithPassword(email: string, password: string): Promise<AccountUser | { error: string }> {
  if (!accountsConfigured()) return { error: "Accounts are not configured yet" };
  const address = email.trim().toLowerCase();
  const rows = await sql()`select id, email, name, password_hash, google_sub from users where email = ${address} limit 1`;
  const row = rows[0] as
    | {
        id: string;
        email: string;
        name?: string | null;
        password_hash?: string | null;
        google_sub?: string | null;
      }
    | undefined;
  if (!row) return { error: "Email or password is wrong" };
  if (!row.password_hash) {
    return { error: row.google_sub ? "This email uses Google. Continue with Google." : "Email or password is wrong" };
  }
  if (!(await verifyPassword(password, row.password_hash))) return { error: "Email or password is wrong" };
  const user = { id: row.id, email: row.email, name: displayName(row.email, row.name) };
  await completeSignIn(user);
  return user;
}

export async function resetPasswordWithOtp(
  email: string,
  code: string,
  password: string,
): Promise<AccountUser | { error: string }> {
  if (!passwordLooksValid(password)) return { error: `Password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters` };
  const address = email.trim().toLowerCase();
  if (!(await consumeEmailOtp(address, code))) return { error: "That code is wrong or expired" };
  const rows = await sql()`select id, email, name from users where email = ${address} limit 1`;
  const row = rows[0] as { id: string; email: string; name?: string | null } | undefined;
  if (!row) return { error: "Create an account first" };
  await sql()`update users set password_hash = ${await hashPassword(password)} where id = ${row.id}`;
  const user = { id: row.id, email: row.email, name: displayName(row.email, row.name) };
  await completeSignIn(user);
  return user;
}
