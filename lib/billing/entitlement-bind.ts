/** Pure Plus helpers — no Next or env imports, so unit tests can load this file. */

export type PlusFields = {
  plus: boolean;
  until: string | null;
  email?: string;
  userId?: string;
  ref?: string;
  planId?: string;
  regionId?: string;
  processor?: string;
  grantedAt?: string;
};

export function plusRevokedByChargeback(
  raw: { plus?: boolean; revokedReason?: string } | null | undefined,
): boolean {
  return raw?.plus === false && raw?.revokedReason === "chargeback";
}

export function applyChargebackRevoke<T extends object>(
  current: T | undefined,
  at: string,
): T & { plus: false; revokedReason: "chargeback"; revokedAt: string } {
  return {
    ...(current as T),
    plus: false,
    revokedReason: "chargeback" as const,
    revokedAt: at,
  };
}

export function isPlusActive(ent: PlusFields | null | undefined): boolean {
  if (!ent?.plus) return false;
  if (!ent.until) return true;
  return Date.parse(ent.until) > Date.now();
}

export function publicEntitlement(ent: PlusFields | null) {
  if (!ent || !isPlusActive(ent)) {
    return {
      plus: false as const,
      planId: null,
      regionId: null,
      processor: null,
      until: null,
      grantedAt: null,
    };
  }
  return {
    plus: true as const,
    planId: ent.planId ?? null,
    regionId: ent.regionId ?? null,
    processor: ent.processor ?? null,
    until: ent.until,
    grantedAt: ent.grantedAt ?? null,
  };
}

/** When accounts are on, Plus only applies to the signed-in owner. Email never leaves this helper. */
export function entitlementForUser<T extends PlusFields>(
  ent: T | null,
  userId: string | null,
  accountsOn: boolean,
): T | null {
  if (!ent || !isPlusActive(ent)) return null;
  if (!accountsOn) return ent;
  if (!userId) return null;
  if (ent.userId && ent.userId !== userId) return null;
  return { ...ent, userId };
}

function untilMs(ent: PlusFields) {
  if (!ent.until) return Number.POSITIVE_INFINITY;
  const ms = Date.parse(ent.until);
  return Number.isFinite(ms) ? ms : 0;
}

/** Prefer the record that is still active and lasts longer. Lifetime (no until) wins. */
export function pickBestEntitlement<T extends PlusFields>(account: T | null, cookie: T | null): T | null {
  const a = account && isPlusActive(account) ? account : null;
  const c = cookie && isPlusActive(cookie) ? cookie : null;
  if (!a) return c;
  if (!c) return a;
  return untilMs(a) >= untilMs(c) ? a : c;
}

export function addPlanPeriod(planId: string, from = new Date()): string | null {
  if (planId === "lifetime") return null;
  const d = new Date(from.getTime());
  if (planId === "trial") d.setUTCDate(d.getUTCDate() + 1);
  else if (planId === "monthly") d.setUTCDate(d.getUTCDate() + 31);
  else d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString();
}

function planRank(planId: string | undefined) {
  if (planId === "lifetime") return 3;
  if (planId === "annual") return 2;
  if (planId === "monthly") return 1;
  return 0;
}

export type GiftStackResult<T extends PlusFields> = {
  next: T;
  alreadyPlus: boolean;
  stacked: boolean;
  keptLifetime: boolean;
};

/**
 * Add a gift period on top of remaining Plus. Never shortens lifetime.
 * Keeps the recipient's own payment ref so a gift chargeback cannot wipe paid Plus.
 */
export function stackGiftOnEntitlement<T extends PlusFields>(
  existing: T | null,
  gift: T,
  now = new Date(),
): GiftStackResult<T> {
  const alreadyPlus = isPlusActive(existing);
  const existingLifetime = Boolean(alreadyPlus && existing && !existing.until);

  if (existingLifetime && existing) {
    return { next: existing, alreadyPlus: true, stacked: false, keptLifetime: true };
  }

  if (gift.planId === "lifetime") {
    return {
      next: { ...gift, plus: true, until: null, planId: "lifetime" },
      alreadyPlus,
      stacked: false,
      keptLifetime: false,
    };
  }

  const from =
    alreadyPlus && existing?.until
      ? new Date(Math.max(now.getTime(), Date.parse(existing.until)))
      : now;
  const until = addPlanPeriod(gift.planId || "monthly", from);
  const planId =
    alreadyPlus && planRank(existing?.planId) > planRank(gift.planId) ? existing!.planId : gift.planId;

  return {
    next: {
      ...gift,
      plus: true,
      until,
      planId,
      ref: alreadyPlus && existing?.ref ? existing.ref : gift.ref,
    },
    alreadyPlus,
    stacked: alreadyPlus,
    keptLifetime: false,
  };
}
