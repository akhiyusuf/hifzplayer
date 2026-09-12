import { PLUS_NAME } from "../brand.ts";
import type { PlanId } from "./plans";

export const PAYSTACK_INTERVAL: Record<Exclude<PlanId, "lifetime">, "monthly" | "annually"> = {
  monthly: "monthly",
  annual: "annually",
};

export type PaystackPlanRow = {
  plan_code?: string;
  amount?: number;
  interval?: string;
  currency?: string;
  name?: string;
  is_deleted?: boolean;
  is_archived?: boolean;
};

export function paystackPlanName(planId: Exclude<PlanId, "lifetime">) {
  return `${PLUS_NAME} — ${planId === "monthly" ? "Monthly" : "Annual"}`;
}

export function pickPaystackPlanCode(
  rows: PaystackPlanRow[],
  opts: { amount: number; interval: string; currency: string },
): string {
  const currency = opts.currency.toUpperCase();
  const matches = rows.filter((row) => {
    if (!row.plan_code || row.is_deleted || row.is_archived) return false;
    if (row.amount !== opts.amount) return false;
    if ((row.interval || "").toLowerCase() !== opts.interval) return false;
    if ((row.currency || "").toUpperCase() !== currency) return false;
    return true;
  });
  if (matches.length === 0) return "";
  const named = matches.find((row) => (row.name || "").includes(PLUS_NAME));
  return (named || matches[0])?.plan_code || "";
}
