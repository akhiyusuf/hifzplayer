import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseGiftEmails, sealGiftClaim, openGiftClaim, validateGiftEmails, classifyGiftRecipient, giftRecipientMessage } from "./gift.ts";

describe("gift emails", () => {
  it("takes one address and rejects extras", () => {
    assert.deepEqual(parseGiftEmails("  Yusuf@Example.com "), ["yusuf@example.com"]);
    const many = validateGiftEmails("a@x.com, b@x.com");
    assert.equal("error" in many, true);
  });

  it("rejects an empty or invalid address", () => {
    assert.equal("error" in validateGiftEmails(""), true);
    assert.equal("error" in validateGiftEmails("not-an-email"), true);
    const ok = validateGiftEmails(["Reader@diras.app"]);
    assert.equal("error" in ok, false);
    if (!("error" in ok)) assert.deepEqual(ok.emails, ["reader@diras.app"]);
  });
});

describe("gift recipient checks", () => {
  it("requires an existing account and rejects gifting yourself", () => {
    assert.equal(
      classifyGiftRecipient({
        buyerId: "user_buyer",
        buyerEmail: "me@diras.app",
        recipientEmail: "friend@diras.app",
        recipientUserId: "user_friend",
      }),
      "ok",
    );
    assert.equal(
      classifyGiftRecipient({
        buyerId: "user_buyer",
        buyerEmail: "me@diras.app",
        recipientEmail: "missing@diras.app",
        recipientUserId: null,
      }),
      "missing",
    );
    assert.equal(
      classifyGiftRecipient({
        buyerId: "user_buyer",
        buyerEmail: "me@diras.app",
        recipientEmail: "me@diras.app",
        recipientUserId: "user_other",
      }),
      "self",
    );
    assert.equal(
      classifyGiftRecipient({
        buyerId: "user_buyer",
        buyerEmail: "me@diras.app",
        recipientEmail: "alias@diras.app",
        recipientUserId: "user_buyer",
      }),
      "self",
    );
    assert.match(giftRecipientMessage("missing"), /sign up first/i);
    assert.match(giftRecipientMessage("self"), /For me/);
  });
});

describe("gift claim token", () => {
  it("round-trips a claim and rejects a tampered token", () => {
    const prev = process.env.BILLING_SIGNING_SECRET;
    process.env.BILLING_SIGNING_SECRET = "gift-test-secret";
    const claim = {
      v: 1 as const,
      planId: "annual" as const,
      regionId: "ng" as const,
      processor: "paystack" as const,
      until: "2027-01-01T00:00:00.000Z",
      ref: "ref_gift",
      buyerId: "user_buyer",
    };
    const token = sealGiftClaim(claim);
    assert.deepEqual(openGiftClaim(token), claim);
    assert.equal(openGiftClaim(`${token}x`), null);
    assert.equal(openGiftClaim("nope"), null);
    if (prev === undefined) delete process.env.BILLING_SIGNING_SECRET;
    else process.env.BILLING_SIGNING_SECRET = prev;
  });
});
