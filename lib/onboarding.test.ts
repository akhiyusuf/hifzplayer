import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldShowOnboarding, shouldStampExistingUser } from "./onboarding.ts";

const fresh = { done: false, sessionCount: 0, recentCount: 0, dayCount: 0 };

describe("onboarding gate", () => {
  it("offers the welcome only to a brand-new device", () => {
    assert.equal(shouldShowOnboarding(fresh), true);
    assert.equal(shouldStampExistingUser(fresh), false);
  });

  it("hides after the welcome was dismissed", () => {
    assert.equal(shouldShowOnboarding({ ...fresh, done: true }), false);
    assert.equal(shouldStampExistingUser({ ...fresh, done: true }), false);
  });

  it("skips people who already have reading history", () => {
    assert.equal(shouldShowOnboarding({ ...fresh, sessionCount: 1 }), false);
    assert.equal(shouldShowOnboarding({ ...fresh, recentCount: 2 }), false);
    assert.equal(shouldShowOnboarding({ ...fresh, dayCount: 3 }), false);
    assert.equal(shouldStampExistingUser({ ...fresh, sessionCount: 1 }), true);
    assert.equal(shouldStampExistingUser({ ...fresh, recentCount: 1 }), true);
    assert.equal(shouldStampExistingUser({ ...fresh, dayCount: 1 }), true);
  });
});
