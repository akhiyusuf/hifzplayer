import { accountsConfigured } from "./config.ts";
import { sql } from "../db/neon.ts";
import {
  type Entitlement,
  grantFromPayment,
  isPlusActive,
} from "@/lib/billing/entitlement";
import { applyChargebackRevoke, plusRevokedByChargeback } from "@/lib/billing/entitlement-bind";
import type { PlanId, Processor, RegionId } from "@/lib/billing/plans";
import { isPlanId, isRegionId } from "@/lib/billing/plans";

type StoredPlus = {
  plus?: boolean;
  plan_id?: string;
  region_id?: string;
  processor?: string;
  until?: string | Date | null;
  ref?: string;
  sub?: string | null;
  granted_at?: string | Date;
  welcome_sent_for?: string | null;
  revoked_at?: string | Date | null;
  revoked_reason?: string | null;
  events?: unknown;
};

type StoredBillingEvent = {
  at: string;
  type: "granted" | "renewed" | "revoked";
  planId?: PlanId;
  regionId?: RegionId;
  processor?: Processor;
  reason?: "chargeback";
};

const EVENT_CAP = 20;

export type AccountPlusState =
  | { status: "none" }
  | { status: "revoked" }
  | { status: "ok"; ent: Entitlement };

export type PlusSaveKind = "granted" | "renewed" | "revoked";

function iso(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function asEvents(raw: unknown): StoredBillingEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is StoredBillingEvent => Boolean(row && typeof row === "object"));
}

function storedToEntitlement(userId: string, raw: StoredPlus): Entitlement | null {
  if (!raw.plan_id || !raw.region_id || !raw.processor || !raw.ref) return null;
  if (!isPlanId(raw.plan_id) || !isRegionId(raw.region_id)) return null;
  if (raw.processor !== "stripe" && raw.processor !== "paystack" && raw.processor !== "trial") return null;
  const ent = grantFromPayment({
    planId: raw.plan_id,
    regionId: raw.region_id,
    processor: raw.processor,
    ref: raw.ref,
    until: iso(raw.until),
    plus: raw.plus !== false,
    sub: raw.sub || undefined,
  });
  ent.userId = userId;
  const granted = iso(raw.granted_at);
  if (granted) ent.grantedAt = granted;
  return ent;
}

async function entitlementRow(userId: string): Promise<StoredPlus | null> {
  if (!accountsConfigured() || !userId) return null;
  try {
    const rows = await sql()`select * from entitlements where user_id = ${userId} limit 1`;
    return (rows[0] as StoredPlus | undefined) || null;
  } catch {
    return null;
  }
}

export async function accountPlusState(userId: string): Promise<AccountPlusState> {
  const raw = await entitlementRow(userId);
  if (!raw) return { status: "none" };
  if (raw.plus === false) return { status: "revoked" };
  const ent = storedToEntitlement(userId, raw);
  if (!ent) return { status: "none" };
  if (!isPlusActive(ent)) return { status: "none" };
  return { status: "ok", ent };
}

export async function savePlusToAccount(userId: string, ent: Entitlement, kind: PlusSaveKind = "granted") {
  if (!accountsConfigured()) return;
  const current = await entitlementRow(userId);
  const events = [
    ...asEvents(current?.events),
    {
      at: ent.grantedAt,
      type: (ent.plus === false ? "revoked" : kind) as StoredBillingEvent["type"],
      planId: ent.planId,
      regionId: ent.regionId,
      processor: ent.processor,
    },
  ].slice(-EVENT_CAP);
  const welcome = current?.welcome_sent_for || null;
  const sub = ent.sub || current?.sub || null;
  await sql()`
    insert into entitlements (
      user_id, plus, plan_id, region_id, processor, until, ref, sub, granted_at,
      revoked_at, revoked_reason, welcome_sent_for, events
    )
    values (
      ${userId}, ${ent.plus}, ${ent.planId}, ${ent.regionId}, ${ent.processor},
      ${ent.until}, ${ent.ref}, ${sub}, ${ent.grantedAt},
      ${ent.plus === false ? new Date().toISOString() : null},
      ${ent.plus === false ? "revoked" : null},
      ${welcome}, ${JSON.stringify(events)}::jsonb
    )
    on conflict (user_id) do update set
      plus = excluded.plus,
      plan_id = excluded.plan_id,
      region_id = excluded.region_id,
      processor = excluded.processor,
      until = excluded.until,
      ref = excluded.ref,
      sub = coalesce(excluded.sub, entitlements.sub),
      granted_at = excluded.granted_at,
      revoked_at = excluded.revoked_at,
      revoked_reason = excluded.revoked_reason,
      events = excluded.events
  `;
}

export async function plusFromAccount(userId: string): Promise<Entitlement | null> {
  const state = await accountPlusState(userId);
  return state.status === "ok" ? state.ent : null;
}

export async function emailForUser(userId: string): Promise<string | null> {
  if (!accountsConfigured()) return null;
  try {
    const rows = await sql()`select email from users where id = ${userId} limit 1`;
    const email = (rows[0] as { email?: string } | undefined)?.email;
    return email?.trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

export async function userIdByEmail(email: string): Promise<string | null> {
  if (!accountsConfigured()) return null;
  const address = email.trim().toLowerCase();
  if (!address) return null;
  try {
    const rows = await sql()`select id from users where email = ${address} limit 1`;
    return (rows[0] as { id?: string } | undefined)?.id || null;
  } catch {
    return null;
  }
}

export async function plusWelcomeAlreadySent(userId: string, _ref?: string): Promise<boolean> {
  const raw = await entitlementRow(userId);
  if (raw?.welcome_sent_for) return true;
  if (!accountsConfigured()) return false;
  try {
    const rows = await sql()`select welcome_sent_for from users where id = ${userId} limit 1`;
    return Boolean((rows[0] as { welcome_sent_for?: string } | undefined)?.welcome_sent_for);
  } catch {
    return false;
  }
}

export async function markPlusWelcomeSent(userId: string, ref: string) {
  if (!accountsConfigured() || !ref) return;
  await sql()`
    update entitlements set welcome_sent_for = ${ref} where user_id = ${userId}
  `;
  await sql()`
    update users set welcome_sent_for = ${ref} where id = ${userId}
  `;
}

export async function trialUsedAt(userId: string): Promise<string | null> {
  if (!accountsConfigured()) return null;
  try {
    const rows = await sql()`select trial_used_at from users where id = ${userId} limit 1`;
    const at = iso((rows[0] as { trial_used_at?: string | Date } | undefined)?.trial_used_at);
    return at && Number.isFinite(Date.parse(at)) ? at : null;
  } catch {
    return null;
  }
}

export async function markTrialUsed(userId: string, at = new Date().toISOString()) {
  if (!accountsConfigured()) return;
  const previous = await trialUsedAt(userId);
  if (previous) return;
  await sql()`update users set trial_used_at = ${at} where id = ${userId} and trial_used_at is null`;
}

export async function accountPlusRevoked(userId: string): Promise<boolean> {
  const raw = await entitlementRow(userId);
  return plusRevokedByChargeback({
    plus: raw?.plus,
    revokedReason: raw?.revoked_reason || undefined,
  });
}

export async function revokePlusOnAccount(userId: string) {
  if (!accountsConfigured()) return;
  const stored = await entitlementRow(userId);
  const at = new Date().toISOString();
  const next = applyChargebackRevoke(
    {
      plus: stored?.plus,
      planId: stored?.plan_id,
      regionId: stored?.region_id,
      processor: stored?.processor,
      until: iso(stored?.until),
      ref: stored?.ref,
      sub: stored?.sub,
      grantedAt: iso(stored?.granted_at),
    },
    at,
  );
  const events = [
    ...asEvents(stored?.events),
    {
      at,
      type: "revoked" as const,
      planId: stored?.plan_id as PlanId | undefined,
      regionId: stored?.region_id as RegionId | undefined,
      processor: stored?.processor as Processor | undefined,
      reason: "chargeback" as const,
    },
  ].slice(-EVENT_CAP);
  if (!stored) {
    await sql()`
      insert into entitlements (
        user_id, plus, plan_id, region_id, processor, until, ref, granted_at,
        revoked_at, revoked_reason, events
      )
      values (
        ${userId}, false, 'monthly', 'us', 'stripe', ${at}, 'chargeback', ${at},
        ${at}, 'chargeback', ${JSON.stringify(events)}::jsonb
      )
      on conflict (user_id) do update set
        plus = false,
        revoked_at = excluded.revoked_at,
        revoked_reason = 'chargeback',
        events = excluded.events
    `;
    return;
  }
  await sql()`
    update entitlements set
      plus = false,
      revoked_at = ${at},
      revoked_reason = 'chargeback',
      events = ${JSON.stringify(events)}::jsonb
    where user_id = ${userId}
  `;
  void next;
}

export async function emailsOnUser(userId: string): Promise<string[]> {
  const email = await emailForUser(userId);
  return email ? [email] : [];
}
