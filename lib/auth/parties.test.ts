import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clerkAuthorizedParties } from "./parties.ts";

describe("clerkAuthorizedParties", () => {
  it("includes the public app origin and extras", () => {
    const prevApp = process.env.NEXT_PUBLIC_APP_URL;
    const prevExtra = process.env.CLERK_AUTHORIZED_PARTIES;
    const prevEnv = process.env.NODE_ENV;
    process.env.NEXT_PUBLIC_APP_URL = "https://diras.app";
    process.env.CLERK_AUTHORIZED_PARTIES = "https://diras.example.workers.dev";
    process.env.NODE_ENV = "production";
    try {
      const parties = clerkAuthorizedParties() || [];
      assert.ok(parties.includes("https://diras.app"));
      assert.ok(parties.includes("https://diras.example.workers.dev"));
      assert.equal(parties.includes("http://localhost:3000"), false);
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = prevApp;
      process.env.CLERK_AUTHORIZED_PARTIES = prevExtra;
      process.env.NODE_ENV = prevEnv;
    }
  });
});
