import type { PlanId, Processor, RegionId } from "./plans";

export type BillingEventType =
  | "checkout_started"
  | "granted"
  | "renewed"
  | "revoked"
  | "confirm_failed"
  | "webhook_received"
  | "payment_failed"
  | "clerk_save_failed"
  | "recover_attempt"
  | "welcome_sent"
  | "welcome_skipped"
  | "welcome_failed";

export type BillingEvent = {
  type: BillingEventType;
  processor?: Processor;
  planId?: PlanId | string;
  regionId?: RegionId | string;
  source?: "checkout" | "confirm" | "return" | "webhook";
  ok?: boolean;
  reason?: string;
  hasUserId?: boolean;
  /** Clerk user id. Never an email, card number, or payment reference. */
  accountId?: string;
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
