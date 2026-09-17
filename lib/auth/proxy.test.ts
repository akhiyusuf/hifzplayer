import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clerkFrontendApiProxyEnabled, clerkProxyUrl } from "./proxy.ts";

describe("clerk proxy URL", () => {
  it("rejects relative paths that break Workers SSR", () => {
    const prev = process.env.NEXT_PUBLIC_CLERK_PROXY_URL;
    process.env.NEXT_PUBLIC_CLERK_PROXY_URL = "/__clerk";
    try {
      assert.equal(clerkProxyUrl(), "");
    } finally {
      process.env.NEXT_PUBLIC_CLERK_PROXY_URL = prev;
    }
  });

  it("enables the proxy only on the matching origin", () => {
    const prev = process.env.NEXT_PUBLIC_CLERK_PROXY_URL;
    process.env.NEXT_PUBLIC_CLERK_PROXY_URL = "https://diras.app/__clerk";
    try {
      assert.equal(clerkProxyUrl(), "https://diras.app/__clerk");
      assert.equal(clerkFrontendApiProxyEnabled(new URL("https://diras.app/sign-in")), true);
      assert.equal(clerkFrontendApiProxyEnabled(new URL("https://localhost:3000/")), false);
    } finally {
      process.env.NEXT_PUBLIC_CLERK_PROXY_URL = prev;
    }
  });
});
