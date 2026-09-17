import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
  applySecurityHeaders,
  contentSecurityPolicy,
  isPaymentReturnPath,
} from "./headers.ts";

describe("security headers", () => {
  it("blocks framing and MIME sniffing", () => {
    const headers = new Headers();
    applySecurityHeaders(headers);
    assert.equal(headers.get("X-Frame-Options"), "DENY");
    assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
    assert.match(headers.get("Referrer-Policy") || "", /strict-origin/);
    const map = Object.fromEntries(SECURITY_HEADERS.map((h) => [h.key, h.value]));
    assert.equal(map["X-Content-Type-Options"], "nosniff");
  });

  it("does not allow embedding the app", () => {
    assert.match(CONTENT_SECURITY_POLICY, /frame-ancestors 'none'/);
    assert.match(CONTENT_SECURITY_POLICY, /object-src 'none'/);
  });

  it("allows Quran audio, the v4 API, and Turnstile as remote connect/script", () => {
    assert.match(CONTENT_SECURITY_POLICY, /api\.quran\.com/);
    assert.match(CONTENT_SECURITY_POLICY, /verses\.quran\.com/);
    assert.match(CONTENT_SECURITY_POLICY, /mirrors\.quranicaudio\.com/);
    assert.match(CONTENT_SECURITY_POLICY, /va\.vercel-scripts\.com/);
    assert.match(CONTENT_SECURITY_POLICY, /vitals\.vercel-insights\.com/);
    assert.match(CONTENT_SECURITY_POLICY, /challenges\.cloudflare\.com/);
    assert.match(CONTENT_SECURITY_POLICY, /frame-src https:\/\/challenges\.cloudflare\.com/);
    assert.doesNotMatch(CONTENT_SECURITY_POLICY, /\*/);
  });

  it("allows the R2 public origin when configured", () => {
    const prev = process.env.R2_PUBLIC_BASE_URL;
    process.env.R2_PUBLIC_BASE_URL = "https://files.diras.app/audio";
    try {
      assert.match(contentSecurityPolicy(false), /files\.diras\.app/);
    } finally {
      process.env.R2_PUBLIC_BASE_URL = prev;
    }
  });

  it("lets Paystack load the payment return pages", () => {
    assert.equal(isPaymentReturnPath("/pricing/success"), true);
    assert.equal(isPaymentReturnPath("/api/billing/return"), true);
    assert.equal(isPaymentReturnPath("/pricing"), false);
    assert.match(contentSecurityPolicy(true), /checkout\.paystack\.com/);
    assert.doesNotMatch(contentSecurityPolicy(true), /frame-ancestors 'none'/);
    const headers = new Headers();
    applySecurityHeaders(headers, { embeddable: true });
    assert.equal(headers.get("X-Frame-Options"), null);
    assert.equal(headers.get("Cross-Origin-Resource-Policy"), "cross-origin");
  });
});
