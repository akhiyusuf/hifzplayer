export const PLAN_IDS = ["monthly", "annual", "lifetime"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const REGION_IDS = ["ng", "my", "ae", "sa", "gb", "us"] as const;
export type RegionId = (typeof REGION_IDS)[number];

export type Processor = "paystack" | "stripe";

export type Region = {
  id: RegionId;
  label: string;
  currency: string;
  processor: Processor;
  /** Amounts in the currency's minor unit (kobo, sen, fils, pence, cents). */
  amounts: Record<PlanId, number>;
};

export const REGIONS: Record<RegionId, Region> = {
  ng: {
    id: "ng",
    label: "Nigeria / West Africa",
    currency: "NGN",
    processor: "paystack",
    amounts: { monthly: 150_000, annual: 1_050_000, lifetime: 2_625_000 },
  },
  my: {
    id: "my",
    label: "Malaysia",
    currency: "MYR",
    processor: "stripe",
    amounts: { monthly: 675, annual: 4_725, lifetime: 11_925 },
  },
  ae: {
    id: "ae",
    label: "United Arab Emirates",
    currency: "AED",
    processor: "stripe",
    amounts: { monthly: 1_125, annual: 7_875, lifetime: 19_425 },
  },
  sa: {
    id: "sa",
    label: "Saudi Arabia",
    currency: "SAR",
    processor: "stripe",
    amounts: { monthly: 1_125, annual: 7_875, lifetime: 19_425 },
  },
  gb: {
    id: "gb",
    label: "United Kingdom",
    currency: "GBP",
    processor: "stripe",
    amounts: { monthly: 299, annual: 2_025, lifetime: 5_175 },
  },
  us: {
    id: "us",
    label: "United States",
    currency: "USD",
    processor: "stripe",
    amounts: { monthly: 374, annual: 2_550, lifetime: 6_675 },
  },
};

export const PLANS: { id: PlanId; name: string; blurb: string; interval: "month" | "year" | null }[] = [
  { id: "monthly", name: "Monthly", blurb: "Billed every month. Cancel any time.", interval: "month" },
  { id: "annual", name: "Annual", blurb: "Two months free versus paying monthly.", interval: "year" },
  { id: "lifetime", name: "Lifetime", blurb: "One payment. Yours to keep.", interval: null },
];

const WEST_AFRICA = new Set([
  "NG",
  "GH",
  "SN",
  "CI",
  "BJ",
  "TG",
  "BF",
  "ML",
  "NE",
  "GW",
  "GM",
  "SL",
  "LR",
  "CV",
  "MR",
]);

export function regionForCountry(country?: string | null): RegionId {
  const c = (country || "").trim().toUpperCase();
  if (WEST_AFRICA.has(c)) return "ng";
  if (c === "MY") return "my";
  if (c === "AE") return "ae";
  if (c === "SA") return "sa";
  if (c === "GB" || c === "UK") return "gb";
  return "us";
}

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as readonly string[]).includes(value);
}

export function isRegionId(value: string): value is RegionId {
  return (REGION_IDS as readonly string[]).includes(value);
}

export function quote(regionId: RegionId, planId: PlanId) {
  const region = REGIONS[regionId];
  const plan = PLANS.find((p) => p.id === planId)!;
  const amount = region.amounts[planId];
  return {
    regionId,
    planId,
    name: plan.name,
    blurb: plan.blurb,
    currency: region.currency,
    processor: region.processor,
    amount,
    interval: plan.interval,
    label: formatMoney(amount, region.currency),
  };
}

export function catalog() {
  return REGION_IDS.map((id) => ({
    id,
    label: REGIONS[id].label,
    currency: REGIONS[id].currency,
    processor: REGIONS[id].processor,
    plans: PLANS.map((plan) => quote(id, plan.id)),
  }));
}

export type Catalog = ReturnType<typeof catalog>;

export function formatMoney(amountMinor: number, currency: string) {
  const major = amountMinor / 100;
  const locale =
    currency === "NGN"
      ? "en-NG"
      : currency === "MYR"
        ? "en-MY"
        : currency === "AED"
          ? "en-AE"
          : currency === "SAR"
            ? "en-SA"
            : currency === "GBP"
              ? "en-GB"
              : "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: major % 1 === 0 ? 0 : 2,
    }).format(major);
  } catch {
    return `${currency} ${major}`;
  }
}
