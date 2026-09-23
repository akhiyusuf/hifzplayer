import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseGiftEmails,
  parseGiftSeats,
  joinGiftEmails,
  sealGiftClaim,
  openGiftClaim,
  validateGiftEmails,
  classifyGiftRecipient,
  giftRecipientMessage,
  GIFT_SEATS,
} from "./gift.ts";

describe("gift emails", () => {
  it("takes several addresses and drops duplicates", () => {
    assert.deepEqual(parseGiftEmails("  Yusuf@Example.com "), ["yusuf@example.com"]);
    assert.deepEqual(parseGiftEmails("a@x.com, b@x.com; A@x.com\nc@x.com"), ["a@x.com", "b@x.com", "c@x.com"]);
    assert.equal(joinGiftEmails(["A@x.com", "b@x.com"]), "a@x.com,b@x.com");
  });

  it("lets a checkout cover up to the seat cap", () => {
    assert.equal(parseGiftSeats(3), 3);
    assert.equal(parseGiftSeats(99), GIFT_SEATS);
    const many = validateGiftEmails("a@x.com, b@x.com", 2);
    assert.equal("error" in many, false);
    if (!("error" in many)) assert.deepEqual(many.emails, ["a@x.com", "b@x.com"]);
    assert.equal("error" in validateGiftEmails("a@x.com", 2), true);
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
  it("allows missing accounts and still rejects gifting yourself", () => {
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
      "invite",
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
