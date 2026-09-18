import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clientIpFromHeaders } from "./client-ip.ts";

describe("clientIpFromHeaders", () => {
  it("prefers Cloudflare's connecting IP over a spoofable forwarded chain", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.9",
      "x-forwarded-for": "1.2.3.4, 10.0.0.1",
    });
    assert.equal(clientIpFromHeaders(headers), "203.0.113.9");
  });

  it("does not use the leftmost X-Forwarded-For hop", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" });
    assert.equal(clientIpFromHeaders(headers), "10.0.0.1");
  });
});
