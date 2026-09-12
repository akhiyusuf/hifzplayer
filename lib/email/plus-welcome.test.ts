import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { plusWelcomeHtml, plusWelcomeSubject, plusWelcomeText } from "./plus-welcome.ts";

describe("Diras Plus welcome email", () => {
  it("confirms the product and the Nigeria monthly plan without payment refs", () => {
    const text = plusWelcomeText({
      planId: "monthly",
      regionId: "ng",
      processor: "paystack",
      until: "2026-10-12T00:00:00.000Z",
    });
    assert.equal(plusWelcomeSubject(), "Diras Plus is active");
    assert.match(text, /Diras Plus is on/);
    assert.match(text, /Monthly/);
    assert.match(text, /Paystack/);
    assert.match(text, /1,500|₦/);
    assert.match(text, /3×, 5×, 10× and unlimited word repeats/);
    assert.match(text, /Focus — Drill, Masked, and Relay/);
    assert.match(text, /Occasion lists and Best of a reciter/);
    assert.doesNotMatch(text, /user_/);
    assert.doesNotMatch(text, /trxref|cs_live|reference/i);
  });

  it("says lifetime instead of an end date", () => {
    const text = plusWelcomeText({
      planId: "lifetime",
      regionId: "us",
      processor: "stripe",
      until: null,
    });
    assert.match(text, /lifetime/i);
    assert.doesNotMatch(text, /active until/);
  });

  it("renders HTML that still names Diras Plus", () => {
    const html = plusWelcomeHtml({
      planId: "annual",
      regionId: "gb",
      processor: "stripe",
      until: "2027-09-11T00:00:00.000Z",
    });
    assert.match(html, /Diras Plus/);
    assert.match(html, /<!doctype html>/i);
  });
});
