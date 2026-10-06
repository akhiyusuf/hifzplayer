import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPaidPlanId, isPlanId, isProcessor } from "./plans.ts";
import {
  grantTrial,
  openTrialUsed,
  sealTrialUsed,
  trialAvailable,
  trialUntil,
} from "./trial.ts";

describe("trial helpers", () => {
  it("treats trial as a plan id but never a paid checkout plan", () => {
    assert.equal(isPlanId("trial"), true);
    assert.equal(isPaidPlanId("trial"), false);
    assert.equal(isProcessor("trial"), true);
  });

  it("grants one day of Plus with trial processor", () => {
    const from = new Date("2026-09-15T12:00:00.000Z");
    assert.equal(trialUntil(from), "2026-09-16T12:00:00.000Z");

    const ent = grantTrial({ regionId: "us", userId: "user_1", ref: "trial:test" });
    assert.equal(ent.plus, true);
    assert.equal(ent.planId, "trial");
    assert.equal(ent.processor, "trial");
    assert.equal(ent.regionId, "us");
    assert.equal(ent.ref, "trial:test");
    assert.ok(ent.until);
    assert.ok(Date.parse(ent.until!) > Date.now());
  });

  it("is available only when Plus is off and trial was not used", () => {
    assert.equal(trialAvailable({ entitlement: null, trialUsed: false }), true);
    assert.equal(trialAvailable({ entitlement: null, trialUsed: true }), false);
    assert.equal(
      trialAvailable({
        entitlement: {
          plus: true,
          until: new Date(Date.now() + 60_000).toISOString(),
        },
        trialUsed: false,
      }),
      false,
    );
    assert.equal(
      trialAvailable({
        entitlement: { plus: true, until: "2000-01-01T00:00:00.000Z" },
        trialUsed: false,
      }),
      true,
    );
  });

  it("seals and opens the trial-used cookie marker", () => {
    const prev = process.env.BILLING_SIGNING_SECRET;
    process.env.BILLING_SIGNING_SECRET = "trial-test-secret";
    try {
      const at = "2026-09-15T12:00:00.000Z";
      const sealed = sealTrialUsed(at);
      assert.ok(sealed);
      assert.equal(openTrialUsed(sealed), at);
      assert.equal(openTrialUsed("tampered"), null);
      assert.equal(openTrialUsed(null), null);
    } finally {
      if (prev === undefined) delete process.env.BILLING_SIGNING_SECRET;
      else process.env.BILLING_SIGNING_SECRET = prev;
    }
  });
});
