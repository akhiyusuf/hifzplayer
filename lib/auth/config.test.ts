import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accountsBrowserReady, accountsConfigured } from "./config.ts";

describe("accounts config", () => {
  it("stays off when keys are missing", () => {
    const prevDb = process.env.DATABASE_URL;
    const prevNeon = process.env.NEON_DATABASE_URL;
    const prevAuth = process.env.AUTH_SECRET;
    const prevBilling = process.env.BILLING_SIGNING_SECRET;
    const prevSite = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    delete process.env.DATABASE_URL;
    delete process.env.NEON_DATABASE_URL;
    delete process.env.AUTH_SECRET;
    delete process.env.BILLING_SIGNING_SECRET;
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    try {
      assert.equal(accountsConfigured(), false);
      assert.equal(accountsBrowserReady(), false);
    } finally {
      if (prevDb !== undefined) process.env.DATABASE_URL = prevDb;
      if (prevNeon !== undefined) process.env.NEON_DATABASE_URL = prevNeon;
      if (prevAuth !== undefined) process.env.AUTH_SECRET = prevAuth;
      if (prevBilling !== undefined) process.env.BILLING_SIGNING_SECRET = prevBilling;
      if (prevSite !== undefined) process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = prevSite;
    }
  });

  it("turns on with Neon and a signing secret", () => {
    const prevDb = process.env.DATABASE_URL;
    const prevAuth = process.env.AUTH_SECRET;
    const prevSite = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    process.env.DATABASE_URL = "postgres://example";
    process.env.AUTH_SECRET = "test-secret";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "1x00000000000000000000AA";
    try {
      assert.equal(accountsConfigured(), true);
      assert.equal(accountsBrowserReady(), true);
    } finally {
      if (prevDb === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prevDb;
      if (prevAuth === undefined) delete process.env.AUTH_SECRET;
      else process.env.AUTH_SECRET = prevAuth;
      if (prevSite === undefined) delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
      else process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = prevSite;
    }
  });
});
