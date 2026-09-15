import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ONBOARDING_LEAD,
  ONBOARDING_POINTS,
  ONBOARDING_PRIMARY_CTA,
  RITUAL_SURAH,
  ritualFocusHref,
  shouldShowOnboarding,
  shouldStampExistingUser,
} from "./onboarding.ts";

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

  it("sells the Al-Fatiha Focus ritual, not a store install", () => {
    assert.match(ONBOARDING_LEAD, /Al-Fātiḥah|Focus|reading stays free/i);
    assert.doesNotMatch(ONBOARDING_LEAD, /morning|evening|Saturday/i);
    assert.match(RITUAL_SURAH, /Fātiḥah|Fatihah/i);
    assert.match(ONBOARDING_PRIMARY_CTA, /Fātiḥah|Fatihah/i);
    assert.match(ritualFocusHref(), /\/read\/1\?/);
    assert.match(ritualFocusHref(), /style=focus/);
    assert.match(ritualFocusHref(), /mode=word/);
    const blob = ONBOARDING_POINTS.map((p) => `${p.title} ${p.body}`).join(" ");
    assert.match(blob, /Word Reps/);
    assert.match(blob, /Masked/);
    assert.match(blob, /Relay/);
    assert.doesNotMatch(blob, /available on the App Store|Install now|Get it on Google Play/i);
  });
});
