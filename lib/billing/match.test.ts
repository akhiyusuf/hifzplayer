import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inferPlanFromAmount, parseCheckoutMetadata, resolvePaidPlan } from "./match.ts";

describe("checkout metadata", () => {
  it("reads plan keys Paystack stores on the transaction", () => {
    const parsed = parseCheckoutMetadata({
      planId: "monthly",
      regionId: "ng",
      userId: "user_abc",
      processor: "paystack",
    });
    assert.equal(parsed.planId, "monthly");
    assert.equal(parsed.regionId, "ng");
    assert.equal(parsed.userId, "user_abc");
  });

  it("reads gift buyer without treating them as the Plus owner", () => {
    const parsed = parseCheckoutMetadata({
      planId: "annual",
      regionId: "ng",
      gift: "1",
      buyerId: "user_buyer",
      custom_fields: [{ display_name: "Gift", variable_name: "gift", value: "1" }],
    });
    assert.equal(parsed.gift, true);
    assert.equal(parsed.buyerId, "user_buyer");
    assert.equal(parsed.userId, "");
  });

  it("falls back to custom_fields when keys are nested there", () => {
    const parsed = parseCheckoutMetadata({
      custom_fields: [
        { display_name: "Plan", variable_name: "planId", value: "annual" },
        { display_name: "Region", variable_name: "regionId", value: "ng" },
      ],
    });
    assert.equal(parsed.planId, "annual");
    assert.equal(parsed.regionId, "ng");
  });
});

describe("amount matching", () => {
  it("maps a ₦1,500 Paystack charge to Nigeria monthly", () => {
    const hit = inferPlanFromAmount(150_000, "NGN");
    assert.deepEqual(hit, { planId: "monthly", regionId: "ng" });
  });

  it("returns null when the amount is not in the catalog", () => {
    assert.equal(inferPlanFromAmount(1_500, "USD"), null);
  });

  it("uses metadata when present and amount matches", () => {
    const paid = resolvePaidPlan({
      amount: 150_000,
      currency: "ngn",
      metadata: { planId: "monthly", regionId: "ng", userId: "user_1" },
    });
    assert.deepEqual(paid, { planId: "monthly", regionId: "ng", userId: "user_1" });
  });

  it("rejects a catalog mismatch even if metadata looks valid", () => {
    const paid = resolvePaidPlan({
      amount: 99,
      currency: "NGN",
      metadata: { planId: "monthly", regionId: "ng" },
    });
    assert.equal("error" in paid, true);
  });

  it("lets a renewal keep the original price after the catalog changes", () => {
    const paid = resolvePaidPlan({
      amount: 99,
      currency: "NGN",
      metadata: { planId: "monthly", regionId: "ng", userId: "user_1" },
      allowAmountDrift: true,
    });
    assert.deepEqual(paid, { planId: "monthly", regionId: "ng", userId: "user_1" });
  });

  it("infers the plan when Paystack dropped metadata on a unique amount", () => {
    const paid = resolvePaidPlan({ amount: 150_000, currency: "NGN", metadata: {} });
    assert.deepEqual(paid, { planId: "monthly", regionId: "ng" });
  });
});
