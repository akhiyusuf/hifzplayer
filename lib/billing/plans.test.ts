import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catalog, formatMoney, quote, regionForCountry, REGIONS } from "./plans.ts";

describe("region routing", () => {
  it("sends Nigeria and West Africa to Paystack NGN", () => {
    for (const code of ["NG", "GH", "SN", "CI", "BJ", "TG", "BF", "ML", "NE", "GW", "GM", "SL", "LR", "CV", "MR"]) {
      assert.equal(regionForCountry(code), "ng");
    }
    assert.equal(REGIONS.ng.processor, "paystack");
    assert.equal(REGIONS.ng.currency, "NGN");
  });

  it("maps Malaysia, Gulf, and UK to Stripe", () => {
    assert.equal(regionForCountry("MY"), "my");
    assert.equal(regionForCountry("AE"), "ae");
    assert.equal(regionForCountry("SA"), "sa");
    assert.equal(regionForCountry("GB"), "gb");
    assert.equal(regionForCountry("UK"), "gb");
    assert.equal(REGIONS.my.processor, "stripe");
    assert.equal(REGIONS.ae.processor, "stripe");
    assert.equal(REGIONS.sa.processor, "stripe");
    assert.equal(REGIONS.gb.processor, "stripe");
  });

  it("defaults other countries to US Stripe", () => {
    assert.equal(regionForCountry("US"), "us");
    assert.equal(regionForCountry("CA"), "us");
    assert.equal(regionForCountry(""), "us");
    assert.equal(regionForCountry(null), "us");
    assert.equal(REGIONS.us.processor, "stripe");
  });
});

describe("price catalog", () => {
  it("matches the published regional amounts", () => {
    assert.equal(quote("ng", "monthly").amount, 200_000);
    assert.equal(quote("ng", "annual").amount, 1_400_000);
    assert.equal(quote("ng", "lifetime").amount, 3_500_000);
    assert.equal(quote("my", "monthly").amount, 900);
    assert.equal(quote("my", "annual").amount, 6_300);
    assert.equal(quote("my", "lifetime").amount, 15_900);
    assert.equal(quote("ae", "monthly").amount, 1_500);
    assert.equal(quote("ae", "annual").amount, 10_500);
    assert.equal(quote("ae", "lifetime").amount, 25_900);
    assert.equal(quote("sa", "monthly").amount, 1_500);
    assert.equal(quote("gb", "monthly").amount, 399);
    assert.equal(quote("gb", "annual").amount, 2_700);
    assert.equal(quote("gb", "lifetime").amount, 6_900);
    assert.equal(quote("us", "monthly").amount, 499);
    assert.equal(quote("us", "annual").amount, 3_400);
    assert.equal(quote("us", "lifetime").amount, 8_900);
  });

  it("formats display labels", () => {
    assert.match(formatMoney(200_000, "NGN"), /2,000|₦/);
    assert.match(formatMoney(499, "USD"), /4\.99|\$/);
    assert.match(formatMoney(399, "GBP"), /3\.99|£/);
  });

  it("exposes every region with three plans", () => {
    const all = catalog();
    assert.equal(all.length, 6);
    for (const region of all) {
      assert.equal(region.plans.length, 3);
      assert.deepEqual(
        region.plans.map((p) => p.planId),
        ["monthly", "annual", "lifetime"],
      );
    }
  });
});
