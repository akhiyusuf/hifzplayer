import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ASK_PROMPTS, ROADMAP, featuredRoadmap, listedRoadmap, storeRoadmap } from "./roadmap.ts";

describe("roadmap", () => {
  it("keeps unique ids and lists Ask plus the parked study layers", () => {
    const ids = ROADMAP.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.includes("ask"));
    assert.ok(ids.includes("phrases"));
    assert.ok(ids.includes("twins"));
    assert.ok(ids.includes("best-of"));
  });

  it("puts Ask in the featured slot as Plus", () => {
    const featured = featuredRoadmap();
    assert.equal(featured.length, 1);
    assert.equal(featured[0]?.id, "ask");
    assert.equal(featured[0]?.plus, true);
    assert.match(featured[0]?.title || "", /Ask the Quran/);
    assert.match(featured[0]?.detail || "", /not give rulings/i);
    assert.match(featured[0]?.detail || "", /Diras Plus/);
    assert.doesNotMatch(featured[0]?.detail || "", /stays free/i);
  });

  it("keeps recurring phrases and near-twins off the paywall", () => {
    for (const id of ["phrases", "twins"]) {
      const item = ROADMAP.find((entry) => entry.id === id);
      assert.equal(item?.plus, false, id);
    }
    const listed = listedRoadmap();
    assert.ok(listed.some((item) => /Recurring phrases/.test(item.title)));
    assert.ok(listed.some((item) => /Near-twin/.test(item.title)));
    assert.ok(!listed.some((item) => item.store));
  });

  it("parks Best of a reciter as Plus", () => {
    const best = ROADMAP.find((item) => item.id === "best-of");
    assert.equal(best?.plus, true);
    assert.equal(best?.featured, undefined);
    assert.match(best?.title || "", /Best of a reciter/);
  });

  it("lists App Store and Google Play as coming soon, not live", () => {
    const apple = ROADMAP.find((item) => item.id === "app-store");
    const play = ROADMAP.find((item) => item.id === "google-play");
    assert.equal(apple?.title, "App Store");
    assert.equal(play?.title, "Google Play");
    assert.equal(apple?.plus, undefined);
    assert.equal(play?.plus, undefined);
    assert.equal(apple?.store, true);
    assert.equal(play?.store, true);
    const stores = storeRoadmap();
    assert.equal(stores.length, 2);
    assert.match(apple?.blurb || "", /Coming soon on the App Store/);
    assert.match(play?.blurb || "", /Coming soon on Google Play/);
    const blob = `${apple?.detail} ${play?.detail}`;
    assert.match(blob, /not the Apple Store/);
    assert.doesNotMatch(blob, /Get it on|Install now|pre-register on Google Play|Available on the App Store/i);
  });

  it("does not invent ship dates", () => {
    const blob = ROADMAP.map((item) => `${item.title} ${item.blurb} ${item.detail}`).join(" ");
    assert.doesNotMatch(blob, /Q[1-4]\s*20\d{2}|next week|guaranteed/i);
    assert.ok(ASK_PROMPTS.length >= 3);
  });
});
