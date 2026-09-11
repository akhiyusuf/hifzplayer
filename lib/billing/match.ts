import { isPlanId, isRegionId, PLAN_IDS, quote, REGIONS, type PlanId, type RegionId } from "./plans.ts";

export type PaidPlan = {
  planId: PlanId;
  regionId: RegionId;
  userId?: string;
};

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Paystack may echo custom_fields instead of (or as well as) our metadata keys. */
function fromCustomFields(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!Array.isArray(raw)) return out;
  for (const row of raw) {
    const rec = asRecord(row);
    if (!rec) continue;
    const key = asString(rec.variable_name) || asString(rec.display_name);
    const value = asString(rec.value);
    if (key && value) out[key] = value;
  }
  return out;
}

export function parseCheckoutMetadata(raw: unknown): { planId: string; regionId: string; userId: string } {
  const rec = asRecord(raw) || {};
  const fields = fromCustomFields(rec.custom_fields);
  return {
    planId: asString(rec.planId) || asString(fields.planId),
    regionId: asString(rec.regionId) || asString(fields.regionId),
    userId: asString(rec.userId) || asString(fields.userId),
  };
}

export function inferPlanFromAmount(amount: number, currency: string): PaidPlan | null {
  const code = (currency || "").trim().toUpperCase();
  const matches: PaidPlan[] = [];
  for (const region of Object.values(REGIONS)) {
    if (region.currency !== code) continue;
    for (const planId of PLAN_IDS) {
      if (region.amounts[planId] === amount) matches.push({ planId, regionId: region.id });
    }
  }
  return matches.length === 1 ? matches[0] : null;
}

export function resolvePaidPlan(opts: {
  amount: number;
  currency: string;
  metadata: unknown;
}): PaidPlan | { error: string } {
  const meta = parseCheckoutMetadata(opts.metadata);
  const currency = (opts.currency || "").trim().toUpperCase();

  if (isPlanId(meta.planId) && isRegionId(meta.regionId)) {
    const expected = quote(meta.regionId, meta.planId);
    const amountKnown = Number.isFinite(opts.amount) && opts.amount >= 0;
    if (amountKnown && (opts.amount !== expected.amount || currency !== expected.currency)) {
      return { error: "Paid amount does not match the catalog" };
    }
    if (!amountKnown && currency && currency !== expected.currency) {
      return { error: "Paid currency does not match the catalog" };
    }
    return {
      planId: meta.planId,
      regionId: meta.regionId,
      ...(meta.userId ? { userId: meta.userId } : {}),
    };
  }

  const inferred = inferPlanFromAmount(opts.amount, currency);
  if (!inferred) return { error: "Payment is missing plan metadata" };
  return {
    ...inferred,
    ...(meta.userId ? { userId: meta.userId } : {}),
  };
}
