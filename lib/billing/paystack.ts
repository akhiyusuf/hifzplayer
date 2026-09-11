import { paystackPlanCode, paystackSecretKey } from "./env";
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
    },
  };
  if (opts.planId === "monthly" || opts.planId === "annual") {
    const plan = paystackPlanCode(opts.planId);
    if (plan) body.plan = plan;
  }
  const data = await paystack<{ data: { authorization_url: string; reference: string } }>(
    "/transaction/initialize",
    { method: "POST", body: JSON.stringify(body) },
  );
  return { url: data.data.authorization_url, reference: data.data.reference };
}

export async function verifyPaystackReference(reference: string) {
  return paystack<{
    data: {
      status: string;
      reference: string;
      amount: number;
      currency: string;
      customer?: { email?: string };
      metadata?: { planId?: string; regionId?: string; userId?: string };
    };
  }>(`/transaction/verify/${encodeURIComponent(reference)}`);
}
