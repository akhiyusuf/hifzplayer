import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashesEqual, hashPassword, hashSecretValue, sixDigitCode, verifyPassword } from "./crypto.ts";

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

  it("hashes passwords with scrypt and rejects a wrong password", async () => {
    const stored = await hashPassword("correct horse");
    assert.match(stored, /^scrypt:[0-9a-f]+:[0-9a-f]+$/);
    assert.equal(await verifyPassword("correct horse", stored), true);
    assert.equal(await verifyPassword("wrong", stored), false);
    assert.equal(await verifyPassword("correct horse", "not-a-hash"), false);
  });
});
