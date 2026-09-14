import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clerkBrowserReady, clerkConfigured } from "./config.ts";

describe("clerk config", () => {
  it("turns on only when both Clerk keys are present", () => {
    const publishable = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
    const secret = Boolean(process.env.CLERK_SECRET_KEY);
    assert.equal(clerkConfigured(), publishable && secret);
    assert.equal(clerkBrowserReady(), publishable);
  });
});
