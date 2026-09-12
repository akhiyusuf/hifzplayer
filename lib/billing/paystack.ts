import { PLUS_NAME } from "@/lib/brand";
import { paystackPlanCode, paystackSecretKey } from "./env";
import { PAYSTACK_INTERVAL, paystackPlanName, pickPaystackPlanCode, type PaystackPlanRow } from "./paystack-plans";
import type { PlanId, Region } from "./plans";

const API = "https://api.paystack.co";

async function paystack<T>(path: string, init?: RequestInit): Promise<T> {
  const key = paystackSecretKey();
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "DirasBilling/1.0",
      ...(init?.headers || {}),
    },
  });
  const data = (await res.json()) as T & { status?: boolean; message?: string };
  if (!res.ok || data.status === false) {
    throw new Error(data.message || `Paystack HTTP ${res.status}`);
  }
  return data;
}

export async function createPaystackCheckout(opts: {
  region: Region;
  planId: PlanId;
  email: string;
  userId?: string;
  callbackUrl: string;
}) {
  const amount = opts.region.amounts[opts.planId];
  const body: Record<string, unknown> = {
    email: opts.email,
    amount,
    currency: opts.region.currency,
    callback_url: opts.callbackUrl,
    metadata: {
      planId: opts.planId,
      regionId: opts.region.id,
      processor: "paystack",
      ...(opts.userId ? { userId: opts.userId } : {}),
      custom_fields: [
        { display_name: "Product", variable_name: "product", value: PLUS_NAME },
        { display_name: "Plan", variable_name: "planId", value: opts.planId },
        { display_name: "Region", variable_name: "regionId", value: opts.region.id },
        ...(opts.userId
          ? [{ display_name: "Account", variable_name: "userId", value: opts.userId }]
          : []),
      ],
    },
  };
  if (opts.planId === "monthly" || opts.planId === "annual") {
    body.plan = await ensurePaystackPlan({
      planId: opts.planId,
      amount,
      currency: opts.region.currency,
    });
  }
  const data = await paystack<{ data: { authorization_url: string; reference: string } }>(
    "/transaction/initialize",
    { method: "POST", body: JSON.stringify(body) },
  );
  return { url: data.data.authorization_url, reference: data.data.reference };
}

const planCache = new Map<string, string>();

export async function ensurePaystackPlan(opts: {
  planId: Exclude<PlanId, "lifetime">;
  amount: number;
  currency: string;
}): Promise<string> {
  const fromEnv = paystackPlanCode(opts.planId);
  if (fromEnv) return fromEnv;

  const cacheKey = `${opts.planId}:${opts.amount}:${opts.currency}`;
  const cached = planCache.get(cacheKey);
  if (cached) return cached;

  const interval = PAYSTACK_INTERVAL[opts.planId];
  const listed = await paystack<{ data?: PaystackPlanRow[] }>("/plan?perPage=100&page=1");
  const existing = pickPaystackPlanCode(listed.data || [], {
    amount: opts.amount,
    interval,
    currency: opts.currency,
  });
  if (existing) {
    planCache.set(cacheKey, existing);
    return existing;
  }

  const created = await paystack<{ data?: { plan_code?: string } }>("/plan", {
    method: "POST",
    body: JSON.stringify({
      name: paystackPlanName(opts.planId),
      interval,
      amount: opts.amount,
      currency: opts.currency,
    }),
  });
  const code = created.data?.plan_code || "";
  if (!code) throw new Error("Paystack did not return a plan code");
  planCache.set(cacheKey, code);
  return code;
}

export type PaystackCharge = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at?: string;
  paidAt?: string;
  customer?: { email?: string };
  metadata?: { planId?: string; regionId?: string; userId?: string; custom_fields?: unknown };
  plan?: { plan_code?: string; interval?: string } | string | null;
  subscription?: { subscription_code?: string; next_payment_date?: string } | null;
};

export async function verifyPaystackReference(reference: string) {
  return paystack<{ data: PaystackCharge }>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export type PaystackSubscriptionEvent = {
  status?: string;
  subscription_code?: string;
  next_payment_date?: string;
  customer?: { email?: string };
  metadata?: unknown;
  plan?: unknown;
};

export function paystackChargeUntil(
  data: Pick<PaystackCharge, "paid_at" | "paidAt">,
  planId: PlanId,
  periodEnd: (planId: PlanId, from?: Date) => string | null,
): string | null {
  if (planId === "lifetime") return null;
  const raw = data.paid_at || data.paidAt || "";
  const from = raw ? new Date(raw) : new Date();
  return periodEnd(planId, Number.isNaN(from.getTime()) ? new Date() : from);
}

export function paystackHasPlan(data: Pick<PaystackCharge, "plan" | "subscription">) {
  if (data.subscription?.subscription_code) return true;
  if (!data.plan) return false;
  if (typeof data.plan === "string") return data.plan.trim().length > 0;
  return Boolean(data.plan.plan_code);
}
