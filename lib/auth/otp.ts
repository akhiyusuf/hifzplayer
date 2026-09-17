import { cookies } from "next/headers";
import { accountsConfigured, SESSION_COOKIE, sessionCookieOptions } from "./config.ts";
import { claimGiftForUser } from "./gifts.ts";
import { hashesEqual, hashSecretValue, randomId, randomToken, sixDigitCode } from "./crypto.ts";
import { sql } from "../db/neon.ts";
import { logOpsEvent } from "@/lib/ops/events";
import { OTP_MAX_ATTEMPTS, OTP_PER_EMAIL_PER_HOUR, OTP_TTL_MS } from "./config.ts";

export type AccountUser = {
  id: string;
  email: string;
  name: string;
  created?: boolean;
};

function displayName(email: string, stored?: string | null) {
  if (stored?.trim()) return stored.trim().split(/\s+/)[0] || stored.trim();
  const local = email.split("@")[0] || "";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  return cleaned ? cleaned.split(/\s+/)[0] : "Reader";
}

export async function findOrCreateUser(email: string): Promise<AccountUser> {
  const address = email.trim().toLowerCase();
  const existing = await sql()`select id, email, name from users where email = ${address} limit 1`;
  const row = existing[0] as { id: string; email: string; name?: string | null } | undefined;
  if (row) {
    return { id: row.id, email: row.email, name: displayName(row.email, row.name) };
  }
  const id = randomId("usr");
  const name = displayName(address);
  await sql()`insert into users (id, email, name) values (${id}, ${address}, ${name})`;
  logOpsEvent({ type: "user_created", accountId: id, ok: true });
  return { id, email: address, name, created: true };
}

export async function createSession(userId: string) {
  const token = randomToken();
  const id = randomId("ses");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  await sql()`
    insert into sessions (id, user_id, token_hash, expires_at)
    values (${id}, ${userId}, ${hashSecretValue(token)}, ${expires})
  `;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
  return token;
}

export async function signedInUser(): Promise<AccountUser | null> {
  if (!accountsConfigured()) return null;
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const hash = hashSecretValue(token);
    const rows = await sql()`
      select u.id, u.email, u.name
      from sessions s
      join users u on u.id = s.user_id
      where s.token_hash = ${hash} and s.expires_at > now()
      limit 1
    `;
    const row = rows[0] as { id: string; email: string; name?: string | null } | undefined;
    if (!row) return null;
    return { id: row.id, email: row.email, name: displayName(row.email, row.name) };
  } catch {
    return null;
  }
}

export async function signedInUserId(): Promise<string | null> {
  const user = await signedInUser();
  return user?.id || null;
}

export async function signedInEmail(): Promise<string | null> {
  const user = await signedInUser();
  return user?.email || null;
}

export async function clearSession() {
  if (!accountsConfigured()) {
    const jar = await cookies();
    jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
    return;
  }
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await sql()`delete from sessions where token_hash = ${hashSecretValue(token)}`;
    } catch {
      /* still clear cookie */
    }
  }
  jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
}

export async function startEmailOtp(email: string) {
  const address = email.trim().toLowerCase();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = await sql()`
    select count(*)::int as n from otp_challenges
    where email = ${address} and created_at > ${hourAgo}
  `;
  const n = Number((recent[0] as { n?: number } | undefined)?.n || 0);
  if (n >= OTP_PER_EMAIL_PER_HOUR) {
    return { ok: true as const, throttled: true };
  }
  const code = sixDigitCode();
  const id = randomId("otp");
  const expires = new Date(Date.now() + OTP_TTL_MS).toISOString();
  await sql()`
    insert into otp_challenges (id, email, code_hash, expires_at)
    values (${id}, ${address}, ${hashSecretValue(`${address}:${code}`)}, ${expires})
  `;
  return { ok: true as const, code, throttled: false };
}

export async function verifyEmailOtp(email: string, code: string): Promise<AccountUser | null> {
  const address = email.trim().toLowerCase();
  const digits = code.replace(/\s/g, "");
  const rows = await sql()`
    select id, code_hash, attempts, expires_at
    from otp_challenges
    where email = ${address}
    order by created_at desc
    limit 1
  `;
  const row = rows[0] as
    | { id: string; code_hash: string; attempts: number; expires_at: string | Date }
    | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;
  if (row.attempts >= OTP_MAX_ATTEMPTS) return null;
  const expected = hashSecretValue(`${address}:${digits}`);
  if (!hashesEqual(row.code_hash, expected)) {
    await sql()`update otp_challenges set attempts = attempts + 1 where id = ${row.id}`;
    return null;
  }
  await sql()`delete from otp_challenges where email = ${address}`;
  const user = await findOrCreateUser(address);
  await createSession(user.id);
  logOpsEvent({ type: "user_signed_in", accountId: user.id, ok: true });
  try {
    await claimGiftForUser({ userId: user.id, emails: [address] });
  } catch {
    /* sign-in still succeeds */
  }
  return user;
}
