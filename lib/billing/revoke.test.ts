import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  paystackDisputeReference,
  subscriptionIdFromStripeInvoice,
  userIdFromPaystackDispute,
  userIdFromStripeCharge,
  userIdFromStripeMetas,
} from "./revoke.ts";

describe("Paystack dispute payload", () => {
  it("reads the nested transaction reference", () => {
    assert.equal(
      paystackDisputeReference({ transaction: { reference: "ref_nested" } }),
      "ref_nested",
    );
    assert.equal(paystackDisputeReference({ transaction_reference: "ref_flat" }), "ref_flat");
    assert.equal(paystackDisputeReference({ reference: "ref_top" }), "ref_top");
    assert.equal(paystackDisputeReference(null), "");
  });

  it("reads the Clerk user id from metadata or the nested transaction", () => {
    assert.equal(userIdFromPaystackDispute({ metadata: { userId: "user_meta" } }), "user_meta");
    assert.equal(
      userIdFromPaystackDispute({ transaction: { metadata: { userId: "user_tx" } } }),
      "user_tx",
    );
    assert.equal(
      userIdFromPaystackDispute({
        transaction: {
          custom_fields: [{ variable_name: "userId", value: "user_field" }],
        },
      }),
      "user_field",
    );
    assert.equal(userIdFromPaystackDispute({}), "");
  });
});

describe("Stripe dispute metadata", () => {
  it("prefers charge metadata, then payment intent, then subscription", () => {
    assert.equal(userIdFromStripeMetas([{ userId: "user_charge" }]), "user_charge");
    assert.equal(
      userIdFromStripeCharge({
        metadata: {},
        payment_intent: { metadata: { userId: "user_pi" } },
      }),
      "user_pi",
    );
    assert.equal(
      userIdFromStripeCharge({
        metadata: {},
        payment_intent: "pi_123",
        invoice: { subscription: { metadata: { userId: "user_sub" } } },
      }),
      "user_sub",
    );
    assert.equal(
      userIdFromStripeCharge({
        metadata: {},
        invoice: {
          parent: {
            subscription_details: {
              metadata: { userId: "user_invoice" },
              subscription: "sub_123",
            },
          },
        },
      }),
      "user_invoice",
    );
    assert.equal(userIdFromStripeCharge({ metadata: {} }), "");
  });
});

describe("Stripe invoice subscription id", () => {
  it("reads the current Invoice.parent shape, then the legacy subscription field", () => {
    assert.equal(
      subscriptionIdFromStripeInvoice({
        parent: { subscription_details: { subscription: "sub_parent" } },
      }),
      "sub_parent",
    );
    assert.equal(
      subscriptionIdFromStripeInvoice({
        parent: { subscription_details: { subscription: { id: "sub_obj" } } },
      }),
      "sub_obj",
    );
    assert.equal(subscriptionIdFromStripeInvoice({ subscription: "sub_legacy" }), "sub_legacy");
    assert.equal(subscriptionIdFromStripeInvoice(null), "");
  });
});
