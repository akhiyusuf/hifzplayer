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
