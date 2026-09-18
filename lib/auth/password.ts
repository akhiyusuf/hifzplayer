import { PASSWORD_MAX, PASSWORD_MIN, accountsConfigured, passwordLooksValid } from "./config.ts";
import { hashPassword, randomId, verifyPassword } from "./crypto.ts";
import { completeSignIn, consumeEmailOtp, type AccountUser } from "./otp.ts";
import { sql } from "../db/neon.ts";
import { logOpsEvent } from "@/lib/ops/events";

function displayName(email: string, stored?: string | null) {
  if (stored?.trim()) return stored.trim().split(/\s+/)[0] || stored.trim();
  const local = email.split("@")[0] || "";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  return cleaned ? cleaned.split(/\s+/)[0] : "Reader";
}

export async function registerWithPassword(email: string, password: string): Promise<AccountUser | { error: string }> {
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
  const user = { id, email: address, name, created: true };
  await completeSignIn(user);
  return user;
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
