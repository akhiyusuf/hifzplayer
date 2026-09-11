import type { PlanId, Processor, RegionId } from "./plans";

export type BillingEventType =
  | "checkout_started"
  | "granted"
  | "confirm_failed"
  | "webhook_received"
  | "clerk_save_failed"
  | "recover_attempt";

export type BillingEvent = {
  type: BillingEventType;
  processor?: Processor;
  planId?: PlanId | string;
  regionId?: RegionId | string;
  source?: "checkout" | "confirm" | "return" | "webhook";
  ok?: boolean;
  reason?: string;
  hasUserId?: boolean;
};

/** Structured payment logs for Vercel. Never includes email, card data, or payment refs. */
export function logBillingEvent(event: BillingEvent) {
  console.info(
    JSON.stringify({
      event: "diras.billing",
      ts: new Date().toISOString(),
      ...event,
    }),
  );
}
