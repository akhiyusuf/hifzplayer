import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONTENT_SECURITY_POLICY, SECURITY_HEADERS } from "./headers.ts";

describe("security headers", () => {
  it("blocks framing and MIME sniffing", () => {
    const map = Object.fromEntries(SECURITY_HEADERS.map((h) => [h.key, h.value]));
    assert.equal(map["X-Frame-Options"], "DENY");
    assert.equal(map["X-Content-Type-Options"], "nosniff");
    assert.match(map["Referrer-Policy"], /strict-origin/);
  });

  it("does not allow embedding the app", () => {
    assert.match(CONTENT_SECURITY_POLICY, /frame-ancestors 'none'/);
    assert.match(CONTENT_SECURITY_POLICY, /object-src 'none'/);
  });

  it("allows Quran audio and the v4 API only as remote connect/media", () => {
    assert.match(CONTENT_SECURITY_POLICY, /api\.quran\.com/);
    assert.match(CONTENT_SECURITY_POLICY, /verses\.quran\.com/);
    assert.doesNotMatch(CONTENT_SECURITY_POLICY, /\*/);
  });
});
