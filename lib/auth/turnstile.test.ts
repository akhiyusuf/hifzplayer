import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifyTurnstileToken } from "./turnstile.ts";

describe("turnstile", () => {
  it("rejects an empty token when the secret is set", async () => {
    const prev = process.env.TURNSTILE_SECRET_KEY;
    process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
    try {
      assert.equal(await verifyTurnstileToken("", new Headers()), false);
      assert.equal(await verifyTurnstileToken("   ", new Headers()), false);
    } finally {
      if (prev === undefined) delete process.env.TURNSTILE_SECRET_KEY;
      else process.env.TURNSTILE_SECRET_KEY = prev;
    }
  });

  it("allows a missing secret outside production", async () => {
    const prev = process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
    try {
      assert.equal(await verifyTurnstileToken("ignored", new Headers()), process.env.NODE_ENV !== "production");
    } finally {
      if (prev !== undefined) process.env.TURNSTILE_SECRET_KEY = prev;
    }
  });
});
