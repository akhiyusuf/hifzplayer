import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifyTurnstileToken } from "./turnstile.ts";

describe("turnstile", () => {
  it("rejects an empty token when the secret is set", async () => {
    const prevKey = process.env.TURNSTILE_SECRET_KEY;
    const prevAlias = process.env.TURNSTILE_SECRET;
    process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
    delete process.env.TURNSTILE_SECRET;
    try {
      assert.equal(await verifyTurnstileToken("", new Headers()), false);
      assert.equal(await verifyTurnstileToken("   ", new Headers()), false);
    } finally {
      if (prevKey === undefined) delete process.env.TURNSTILE_SECRET_KEY;
      else process.env.TURNSTILE_SECRET_KEY = prevKey;
      if (prevAlias === undefined) delete process.env.TURNSTILE_SECRET;
      else process.env.TURNSTILE_SECRET = prevAlias;
    }
  });

  it("skips verification when no secret is configured", async () => {
    const prevKey = process.env.TURNSTILE_SECRET_KEY;
    const prevAlias = process.env.TURNSTILE_SECRET;
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_SECRET;
    try {
      assert.equal(await verifyTurnstileToken("", new Headers()), true);
      assert.equal(await verifyTurnstileToken("ignored", new Headers()), true);
    } finally {
      if (prevKey !== undefined) process.env.TURNSTILE_SECRET_KEY = prevKey;
      if (prevAlias !== undefined) process.env.TURNSTILE_SECRET = prevAlias;
    }
  });

  it("accepts TURNSTILE_SECRET as an alias for TURNSTILE_SECRET_KEY", async () => {
    const prevKey = process.env.TURNSTILE_SECRET_KEY;
    const prevAlias = process.env.TURNSTILE_SECRET;
    delete process.env.TURNSTILE_SECRET_KEY;
    process.env.TURNSTILE_SECRET = "1x0000000000000000000000000000000AA";
    try {
      assert.equal(await verifyTurnstileToken("", new Headers()), false);
    } finally {
      if (prevKey === undefined) delete process.env.TURNSTILE_SECRET_KEY;
      else process.env.TURNSTILE_SECRET_KEY = prevKey;
      if (prevAlias === undefined) delete process.env.TURNSTILE_SECRET;
      else process.env.TURNSTILE_SECRET = prevAlias;
    }
  });
});
