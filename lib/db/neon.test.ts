import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { databaseConfigured, databaseUrl } from "./neon.ts";

describe("neon config", () => {
  it("stays off without a connection string", () => {
    const prev = process.env.DATABASE_URL;
    const prevNeon = process.env.NEON_DATABASE_URL;
    delete process.env.DATABASE_URL;
    delete process.env.NEON_DATABASE_URL;
    try {
      assert.equal(databaseUrl(), "");
      assert.equal(databaseConfigured(), false);
    } finally {
      if (prev !== undefined) process.env.DATABASE_URL = prev;
      if (prevNeon !== undefined) process.env.NEON_DATABASE_URL = prevNeon;
    }
  });
});
