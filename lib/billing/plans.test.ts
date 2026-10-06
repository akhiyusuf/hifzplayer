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
    assert.equal(quote("ng", "monthly").amount, 150_000);
    assert.equal(quote("ng", "annual").amount, 1_050_000);
    assert.equal(quote("ng", "lifetime").amount, 2_625_000);
    assert.equal(quote("my", "monthly").amount, 675);
    assert.equal(quote("my", "annual").amount, 4_725);
    assert.equal(quote("my", "lifetime").amount, 11_925);
    assert.equal(quote("ae", "monthly").amount, 1_125);
    assert.equal(quote("ae", "annual").amount, 7_875);
    assert.equal(quote("ae", "lifetime").amount, 19_425);
    assert.equal(quote("sa", "monthly").amount, 1_125);
    assert.equal(quote("gb", "monthly").amount, 299);
    assert.equal(quote("gb", "annual").amount, 2_025);
    assert.equal(quote("gb", "lifetime").amount, 5_175);
    assert.equal(quote("us", "monthly").amount, 374);
    assert.equal(quote("us", "annual").amount, 2_550);
    assert.equal(quote("us", "lifetime").amount, 6_675);
  });

  it("formats display labels", () => {
    assert.match(formatMoney(150_000, "NGN"), /1,500|₦/);
    assert.match(formatMoney(374, "USD"), /3\.74|\$/);
    assert.match(formatMoney(299, "GBP"), /2\.99|£/);
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
