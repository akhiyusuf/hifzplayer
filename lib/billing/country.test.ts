import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkoutRegionId, countryFromHeaders } from "./country.ts";

describe("checkout region", () => {
  it("reads Vercel country headers", () => {
    const headers = new Headers({ "x-vercel-ip-country": "ng" });
    assert.equal(countryFromHeaders(headers), "NG");
  });

  it("ignores a client-supplied region", () => {
    const nigeria = new Headers({ "x-vercel-ip-country": "NG" });
    assert.equal(checkoutRegionId(nigeria, "us"), "ng");
    assert.equal(checkoutRegionId(nigeria, "gb"), "ng");
    const uk = new Headers({ "x-vercel-ip-country": "GB" });
    assert.equal(checkoutRegionId(uk, "ng"), "gb");
  });

  it("defaults unknown countries to US Stripe", () => {
    assert.equal(checkoutRegionId(new Headers()), "us");
  });
});
