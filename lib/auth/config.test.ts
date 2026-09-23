import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accountsBrowserReady, accountsConfigured, googleConfigured, passwordLooksValid } from "./config.ts";

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
    const prevGoogleId = process.env.GOOGLE_CLIENT_ID;
    const prevGoogleSecret = process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    try {
      assert.equal(accountsConfigured(), false);
      assert.equal(accountsBrowserReady(), false);
      assert.equal(googleConfigured(), false);
    } finally {
      if (prevDb !== undefined) process.env.DATABASE_URL = prevDb;
      if (prevNeon !== undefined) process.env.NEON_DATABASE_URL = prevNeon;
      if (prevAuth !== undefined) process.env.AUTH_SECRET = prevAuth;
      if (prevBilling !== undefined) process.env.BILLING_SIGNING_SECRET = prevBilling;
      if (prevSite !== undefined) process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = prevSite;
      if (prevGoogleId !== undefined) process.env.GOOGLE_CLIENT_ID = prevGoogleId;
      if (prevGoogleSecret !== undefined) process.env.GOOGLE_CLIENT_SECRET = prevGoogleSecret;
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

  it("turns Google on only with both client id and secret", () => {
    const prevId = process.env.GOOGLE_CLIENT_ID;
    const prevSecret = process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    try {
      assert.equal(googleConfigured(), false);
      process.env.GOOGLE_CLIENT_ID = "id.apps.googleusercontent.com";
      assert.equal(googleConfigured(), false);
      process.env.GOOGLE_CLIENT_SECRET = "secret";
      assert.equal(googleConfigured(), true);
    } finally {
      if (prevId === undefined) delete process.env.GOOGLE_CLIENT_ID;
      else process.env.GOOGLE_CLIENT_ID = prevId;
      if (prevSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
      else process.env.GOOGLE_CLIENT_SECRET = prevSecret;
    }
  });

  it("requires 8–128 character passwords", () => {
    assert.equal(passwordLooksValid("short"), false);
    assert.equal(passwordLooksValid("longenough"), true);
    assert.equal(passwordLooksValid("a".repeat(128)), true);
    assert.equal(passwordLooksValid("a".repeat(129)), false);
  });
});
