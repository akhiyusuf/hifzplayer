import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  stripeInvoiceAmount,
  stripeInvoiceMetadata,
  stripeInvoiceSubscriptionId,
  stripeSubscriptionUntil,
} from "./stripe-parse.ts";

describe("stripe invoice parse", () => {
  it("reads the subscription from parent.subscription_details", () => {
    const id = stripeInvoiceSubscriptionId({
      subscription: "sub_old",
      parent: { subscription_details: { subscription: "sub_new", metadata: { planId: "annual" } } },
    });
    assert.equal(id, "sub_new");
  });

  it("merges invoice and subscription snapshot metadata", () => {
    const meta = stripeInvoiceMetadata({
      metadata: { processor: "stripe" },
      parent: { subscription_details: { subscription: "sub_1", metadata: { planId: "monthly", userId: "user_1" } } },
    });
    assert.equal(meta.planId, "monthly");
    assert.equal(meta.userId, "user_1");
    assert.equal(meta.processor, "stripe");
  });

  it("uses amount_paid and subscription period end", () => {
    assert.equal(stripeInvoiceAmount({ amount_paid: 499, total: 500 }), 499);
    const until = stripeSubscriptionUntil({
      items: { data: [{ current_period_end: 1_800_000_000 }] },
    });
    assert.equal(until, new Date(1_800_000_000 * 1000).toISOString());
  });
});
