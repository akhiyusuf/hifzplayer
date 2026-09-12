import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickPaystackPlanCode } from "./paystack-plans.ts";

describe("paystack plan picker", () => {
  it("picks the Diras Plus plan when amount and interval match", () => {
    const code = pickPaystackPlanCode(
      [
        { plan_code: "PLN_other", amount: 200_000, interval: "monthly", currency: "NGN", name: "Other" },
        { plan_code: "PLN_diras", amount: 200_000, interval: "monthly", currency: "NGN", name: "Diras Plus — Monthly" },
        { plan_code: "PLN_gone", amount: 200_000, interval: "monthly", currency: "NGN", name: "Diras Plus — Monthly", is_archived: true },
      ],
      { amount: 200_000, interval: "monthly", currency: "NGN" },
    );
    assert.equal(code, "PLN_diras");
  });

  it("ignores the wrong interval", () => {
    const code = pickPaystackPlanCode(
      [{ plan_code: "PLN_year", amount: 200_000, interval: "annually", currency: "NGN", name: "Diras Plus — Annual" }],
      { amount: 200_000, interval: "monthly", currency: "NGN" },
    );
    assert.equal(code, "");
  });
});
