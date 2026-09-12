import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { entitlementForUser, isPlusActive, pickBestEntitlement, publicEntitlement, type PlusFields } from "./entitlement-bind.ts";

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

  it("binds a legacy cookie to the signed-in user", () => {
    const ent = entitlementForUser(sample(), "user_9", true);
    assert.equal(ent?.userId, "user_9");
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
