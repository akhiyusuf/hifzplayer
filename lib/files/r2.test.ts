import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { r2Configured, r2ObjectUrl, r2PublicOrigin } from "./r2.ts";

describe("r2 public URLs", () => {
  it("builds object URLs from the public base", () => {
    const prev = process.env.R2_PUBLIC_BASE_URL;
    process.env.R2_PUBLIC_BASE_URL = "https://files.diras.app/";
    try {
      assert.equal(r2Configured(), true);
      assert.equal(r2PublicOrigin(), "https://files.diras.app");
      assert.equal(r2ObjectUrl("audio/husary/001.mp3"), "https://files.diras.app/audio/husary/001.mp3");
    } finally {
      process.env.R2_PUBLIC_BASE_URL = prev;
    }
  });
});
