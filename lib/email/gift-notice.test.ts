import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { giftNoticeHtml, giftNoticeSubject, giftNoticeText } from "./gift-notice.ts";

describe("gift notice email", () => {
  it("tells a new reader to sign up with the gifted email", () => {
    const prev = process.env.GOOGLE_SIGN_IN;
    delete process.env.GOOGLE_SIGN_IN;
    try {
      const text = giftNoticeText({
        existingAccount: false,
        signUpUrl: "https://example.test/sign-up",
      });
      assert.equal(giftNoticeSubject(), "Someone gifted you Diras Plus");
      assert.match(text, /Assalamu alaikum/);
      assert.match(text, /gifted you Diras Plus/);
      assert.match(text, /You have been granted Diras Plus/);
      assert.match(text, /Sign in or create a Diras account with this same email/);
      assert.match(text, /email and a password/);
      assert.doesNotMatch(text, /Google/);
      assert.match(text, /https:\/\/example\.test\/sign-up/);
      assert.doesNotMatch(text, /trxref|cs_live|reference/i);
      assert.doesNotMatch(text, /user_/);
    } finally {
      if (prev === undefined) delete process.env.GOOGLE_SIGN_IN;
      else process.env.GOOGLE_SIGN_IN = prev;
    }
  });

  it("mentions Google only while Google sign-in is enabled", () => {
    const prevFlag = process.env.GOOGLE_SIGN_IN;
    const prevId = process.env.GOOGLE_CLIENT_ID;
    const prevSecret = process.env.GOOGLE_CLIENT_SECRET;
    process.env.GOOGLE_CLIENT_ID = "id.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    process.env.GOOGLE_SIGN_IN = "1";
    try {
      const text = giftNoticeText({ existingAccount: true, signUpUrl: "https://example.test/sign-in" });
      assert.match(text, /password or Google/);
    } finally {
      if (prevFlag === undefined) delete process.env.GOOGLE_SIGN_IN;
      else process.env.GOOGLE_SIGN_IN = prevFlag;
      if (prevId === undefined) delete process.env.GOOGLE_CLIENT_ID;
      else process.env.GOOGLE_CLIENT_ID = prevId;
      if (prevSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
      else process.env.GOOGLE_CLIENT_SECRET = prevSecret;
    }
  });

  it("tells an existing account to sign in with that email", () => {
    const text = giftNoticeText({
      existingAccount: true,
      signUpUrl: "https://example.test/sign-in",
    });
    assert.match(text, /Sign in to Diras with this same email/);
    assert.match(giftNoticeHtml({ existingAccount: true, signUpUrl: "https://example.test/sign-in" }), /Diras Plus/);
  });
});
