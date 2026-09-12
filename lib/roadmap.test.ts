import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ASK_PROMPTS, ROADMAP, featuredRoadmap, listedRoadmap } from "./roadmap.ts";

describe("roadmap", () => {
  it("keeps unique ids and lists Ask plus the parked study layers", () => {
    const ids = ROADMAP.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.includes("ask"));
    assert.ok(ids.includes("phrases"));
    assert.ok(ids.includes("twins"));
  });

  it("puts Ask in the featured slot", () => {
    const featured = featuredRoadmap();
    assert.equal(featured.length, 1);
    assert.equal(featured[0]?.id, "ask");
    assert.match(featured[0]?.title || "", /Ask the Quran/);
    assert.match(featured[0]?.detail || "", /not give rulings/i);
  });

  it("keeps recurring phrases and near-twins off the paywall", () => {
    for (const id of ["phrases", "twins", "ask"]) {
      const item = ROADMAP.find((entry) => entry.id === id);
      assert.equal(item?.plus, false, id);
    }
    const listed = listedRoadmap();
    assert.ok(listed.some((item) => /Recurring phrases/.test(item.title)));
    assert.ok(listed.some((item) => /Near-twin/.test(item.title)));
  });

  it("does not invent ship dates", () => {
    const blob = ROADMAP.map((item) => `${item.title} ${item.blurb} ${item.detail}`).join(" ");
    assert.doesNotMatch(blob, /Q[1-4]\s*20\d{2}|next week|guaranteed/i);
    assert.ok(ASK_PROMPTS.length >= 3);
  });
});
