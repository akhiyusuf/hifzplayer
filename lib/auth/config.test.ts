import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clerkBrowserReady, clerkConfigured } from "./config.ts";

describe("clerk config", () => {
  it("stays off when keys are missing", () => {
    assert.equal(clerkConfigured(), false);
    assert.equal(clerkBrowserReady(), false);
  });
});
