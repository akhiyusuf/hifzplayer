import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { entitlementForUser, isPlusActive, publicEntitlement, type Entitlement } from "./entitlement.ts";

function sample(over: Partial<Entitlement> = {}): Entitlement {
  return {
    v: 1,
    plus: true,
    planId: "annual",
    regionId: "us",
    processor: "stripe",
    until: new Date(Date.now() + 86400000).toISOString(),
    email: "secret@example.com",
    ref: "cs_test",
    grantedAt: new Date().toISOString(),
    ...over,
  };
}

describe("public entitlement", () => {
  it("never includes email or payment refs", () => {
    const pub = publicEntitlement(sample());
    assert.equal(pub.plus, true);
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
