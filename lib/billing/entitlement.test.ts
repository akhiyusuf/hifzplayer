import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  entitlementForUser,
  isPlusActive,
  pickBestEntitlement,
  publicEntitlement,
  applyChargebackRevoke,
  plusRevokedByChargeback,
  stackGiftOnEntitlement,
  mergePaidOnAccount,
  addPlanPeriod,
  type PlusFields,
} from "./entitlement-bind.ts";

function sample(over: Partial<PlusFields> = {}): PlusFields {
  return {
    plus: true,
    planId: "annual",
    regionId: "us",
    processor: "stripe",
    until: new Date(Date.now() + 86400000).toISOString(),
    email: "secret@example.com",
    ref: "cs_test",
    ...over,
  };
}

describe("public entitlement", () => {
  it("never includes email or payment refs", () => {
    const pub = publicEntitlement(sample({ grantedAt: "2026-01-01T00:00:00.000Z" }));
    assert.equal(pub.plus, true);
    assert.equal(pub.grantedAt, "2026-01-01T00:00:00.000Z");
    assert.equal("email" in pub, false);
    assert.equal("ref" in pub, false);
    assert.equal("userId" in pub, false);
  });

  it("hides expired plans", () => {
    const pub = publicEntitlement(sample({ until: "2000-01-01T00:00:00.000Z" }));
    assert.equal(pub.plus, false);
    assert.equal(isPlusActive(sample({ until: "2000-01-01T00:00:00.000Z" })), false);
  });
});

describe("account-bound plus", () => {
  it("keeps browser plus when accounts are off", () => {
    const ent = entitlementForUser(sample(), null, false);
    assert.equal(ent?.plus, true);
  });

  it("ignores plus unless the signed-in user owns it", () => {
    assert.equal(entitlementForUser(sample({ userId: "user_1" }), null, true), null);
    assert.equal(entitlementForUser(sample({ userId: "user_1" }), "user_2", true), null);
    assert.equal(entitlementForUser(sample({ userId: "user_1" }), "user_1", true)?.plus, true);
  });

  it("ignores a cookie with no owner when accounts are on", () => {
    assert.equal(entitlementForUser(sample(), "user_9", true), null);
    assert.equal(entitlementForUser(sample({ userId: "user_9" }), "user_9", true)?.plus, true);
  });
});

describe("chargeback revoke", () => {
  it("turns Plus off and remembers the reason", () => {
    const next = applyChargebackRevoke({ plus: true, planId: "monthly", ref: "ref_1" }, "2026-09-12T00:00:00.000Z");
    assert.equal(next.plus, false);
    assert.equal(next.revokedReason, "chargeback");
    assert.equal(next.planId, "monthly");
    assert.equal(plusRevokedByChargeback(next), true);
    assert.equal(isPlusActive({ plus: false, until: null }), false);
  });

  it("does not treat an expired plan as a chargeback", () => {
    assert.equal(plusRevokedByChargeback({ plus: true, revokedReason: "chargeback" }), false);
    assert.equal(plusRevokedByChargeback({ plus: false }), false);
    assert.equal(plusRevokedByChargeback(null), false);
  });
});

describe("pick best entitlement", () => {
  it("prefers the later until when both are active", () => {
    const cookie = sample({ until: new Date(Date.now() + 86400000).toISOString() });
    const account = sample({ until: new Date(Date.now() + 86400000 * 40).toISOString() });
    const best = pickBestEntitlement(account, cookie);
    assert.equal(best?.until, account.until);
  });

  it("keeps lifetime over a dated plan", () => {
    const lifetime = sample({ until: null, planId: "lifetime" });
    const monthly = sample({ until: new Date(Date.now() + 86400000 * 400).toISOString(), planId: "monthly" });
    assert.equal(pickBestEntitlement(lifetime, monthly)?.planId, "lifetime");
  });

  it("ignores a revoked or expired account record", () => {
    const expired = sample({ until: "2000-01-01T00:00:00.000Z" });
    const cookie = sample();
    assert.equal(pickBestEntitlement(expired, cookie)?.ref, cookie.ref);
    assert.equal(pickBestEntitlement(sample({ plus: false }), cookie)?.ref, cookie.ref);
  });
});

describe("gift stacking", () => {
  it("adds a month on top of remaining Plus and keeps the paid ref", () => {
    const now = new Date("2026-09-13T00:00:00.000Z");
    const existingUntil = "2026-12-01T00:00:00.000Z";
    const stacked = stackGiftOnEntitlement(
      sample({ until: existingUntil, planId: "annual", ref: "own_pay" }),
      sample({ until: "2026-10-14T00:00:00.000Z", planId: "monthly", ref: "gift_pay" }),
      now,
    );
    assert.equal(stacked.alreadyPlus, true);
    assert.equal(stacked.stacked, true);
    assert.equal(stacked.keptLifetime, false);
    assert.equal(stacked.next.ref, "own_pay");
    assert.equal(stacked.next.planId, "annual");
    assert.equal(stacked.next.until, addPlanPeriod("monthly", new Date(existingUntil)));
  });

  it("does not shorten lifetime when a monthly gift arrives", () => {
    const stacked = stackGiftOnEntitlement(
      sample({ until: null, planId: "lifetime", ref: "own_life" }),
      sample({ until: "2026-10-14T00:00:00.000Z", planId: "monthly", ref: "gift_pay" }),
    );
    assert.equal(stacked.keptLifetime, true);
    assert.equal(stacked.stacked, false);
    assert.equal(stacked.next.until, null);
    assert.equal(stacked.next.planId, "lifetime");
    assert.equal(stacked.next.ref, "own_life");
  });

  it("applies a gift from now when the account has no Plus", () => {
    const now = new Date("2026-09-13T00:00:00.000Z");
    const stacked = stackGiftOnEntitlement(null, sample({ planId: "monthly", ref: "gift_pay" }), now);
    assert.equal(stacked.alreadyPlus, false);
    assert.equal(stacked.stacked, false);
    assert.equal(stacked.next.until, addPlanPeriod("monthly", now));
    assert.equal(stacked.next.ref, "gift_pay");
  });
});

describe("paid merge", () => {
  it("keeps lifetime when a shorter paid period arrives", () => {
    const merged = mergePaidOnAccount(
      sample({ until: null, planId: "lifetime", ref: "own_life" }),
      sample({ until: "2026-10-14T00:00:00.000Z", planId: "monthly", ref: "sub_pay" }),
    );
    assert.equal(merged.until, null);
    assert.equal(merged.planId, "lifetime");
    assert.equal(merged.ref, "own_life");
  });
});
