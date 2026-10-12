import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { paystackWebhookAction, stripeSubscriptionAction, stripeWebhookAction } from "./webhook-kind.ts";

describe("stripe webhook routing", () => {
  it("renews on paid invoices and revokes a deleted subscription", () => {
    assert.equal(stripeWebhookAction("checkout.session.completed"), "checkout");
    assert.equal(stripeWebhookAction("invoice.paid"), "renew");
    assert.equal(stripeWebhookAction("invoice.payment_succeeded"), "renew");
    assert.equal(stripeWebhookAction("invoice.payment_failed"), "fail");
    assert.equal(stripeWebhookAction("customer.subscription.deleted"), "revoke");
    assert.equal(stripeWebhookAction("customer.subscription.updated"), "renew");
    assert.equal(stripeWebhookAction("ping"), "ignore");
  });

  it("keeps access while a subscription is set to cancel at period end", () => {
    assert.equal(stripeSubscriptionAction("active", true), "renew");
    assert.equal(stripeSubscriptionAction("active", false), "renew");
    assert.equal(stripeSubscriptionAction("canceled", false), "revoke");
    assert.equal(stripeSubscriptionAction("unpaid", false), "revoke");
    assert.equal(stripeSubscriptionAction("past_due", false), "fail");
  });
});

describe("paystack webhook routing", () => {
  it("treats charge.success as fulfill and disable as revoke", () => {
    assert.equal(paystackWebhookAction("charge.success"), "checkout");
    assert.equal(paystackWebhookAction("invoice.payment_failed"), "fail");
    assert.equal(paystackWebhookAction("subscription.disable"), "revoke");
    assert.equal(paystackWebhookAction("subscription.not_renew"), "revoke");
    assert.equal(paystackWebhookAction("transfer.success"), "ignore");
  });
});
