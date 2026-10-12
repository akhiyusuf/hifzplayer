import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stackGiftOnEntitlement, type PlusFields } from "./entitlement-bind.ts";

function gift(partial: Partial<PlusFields> & Pick<PlusFields, "planId">): PlusFields {
  return {
    plus: true,
    until: partial.until ?? "2027-01-01T00:00:00.000Z",
    ref: partial.ref ?? "gift_ref",
    planId: partial.planId,
    ...partial,
  };
}

describe("stackGiftOnEntitlement", () => {
  it("grants a first gift as-is", () => {
    const next = stackGiftOnEntitlement(null, gift({ planId: "annual", until: "2027-06-01T00:00:00.000Z" }));
    assert.equal(next.alreadyPlus, false);
    assert.equal(next.stacked, false);
    assert.equal(next.next.plus, true);
    assert.equal(next.next.planId, "annual");
  });

  it("adds time on top of remaining Plus instead of replacing it", () => {
    const existing: PlusFields = {
      plus: true,
      until: "2026-12-01T00:00:00.000Z",
      ref: "paid_ref",
      planId: "monthly",
    };
    const next = stackGiftOnEntitlement(
      existing,
      gift({ planId: "annual", until: "2027-01-01T00:00:00.000Z", ref: "gift_ref" }),
      new Date("2026-09-14T00:00:00.000Z"),
    );
    assert.equal(next.alreadyPlus, true);
    assert.equal(next.stacked, true);
    assert.equal(next.keptLifetime, false);
    assert.equal(next.next.ref, "paid_ref");
    assert.equal(next.next.until, "2027-12-01T00:00:00.000Z");
  });

  it("leaves lifetime Plus in place", () => {
    const existing: PlusFields = { plus: true, until: null, ref: "life", planId: "lifetime" };
    const next = stackGiftOnEntitlement(existing, gift({ planId: "annual" }));
    assert.equal(next.keptLifetime, true);
    assert.equal(next.stacked, false);
    assert.equal(next.next.until, null);
    assert.equal(next.next.ref, "life");
  });
});
