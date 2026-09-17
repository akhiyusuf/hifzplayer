import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashesEqual, hashSecretValue, sixDigitCode } from "./crypto.ts";

describe("auth crypto", () => {
  it("hashes with the signing secret and compares in constant time", () => {
    const prev = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "test-secret";
    try {
      const hash = hashSecretValue("123456");
      assert.equal(hash.length, 64);
      assert.equal(hashesEqual(hash, hashSecretValue("123456")), true);
      assert.equal(hashesEqual(hash, hashSecretValue("000000")), false);
    } finally {
      process.env.AUTH_SECRET = prev;
    }
  });

  it("issues a six-digit code", () => {
    assert.match(sixDigitCode(), /^\d{6}$/);
  });
});
