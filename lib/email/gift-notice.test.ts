import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { giftNoticeHtml, giftNoticeSubject, giftNoticeText } from "./gift-notice.ts";

describe("gift notice email", () => {
  it("tells a new reader to sign up with the gifted email, Google allowed", () => {
    const text = giftNoticeText({
      existingAccount: false,
      signUpUrl: "https://example.test/sign-up",
    });
    assert.equal(giftNoticeSubject(), "Someone gifted you Diras Plus");
    assert.match(text, /Assalamu alaikum/);
    assert.match(text, /gifted you Diras Plus/);
    assert.match(text, /Create a Diras account with this same email/);
    assert.match(text, /Google is fine/);
    assert.match(text, /https:\/\/example\.test\/sign-up/);
    assert.doesNotMatch(text, /trxref|cs_live|reference/i);
    assert.doesNotMatch(text, /user_/);
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
