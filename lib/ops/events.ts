/** Product and incident logs for Vercel. Never includes email, cards, or payment refs. */

export type OpsEventType = "user_created" | "user_signed_in" | "incident";

export type OpsEvent = {
  type: OpsEventType;
  /** Clerk user id. Same value shown on /account. */
  accountId?: string;
  reason?: string;
  ok?: boolean;
};

export function logOpsEvent(event: OpsEvent) {
  console.info(
    JSON.stringify({
      event: "diras.ops",
      ts: new Date().toISOString(),
      ...event,
    }),
  );
}
