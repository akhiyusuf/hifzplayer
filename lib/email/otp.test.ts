import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { otpEmailHtml, otpEmailSubject, otpEmailText } from "./otp.ts";

describe("sign-in OTP email", () => {
  it("names Diras and the code without sounding like a receipt", () => {
    const text = otpEmailText("482917");
    assert.equal(otpEmailSubject(), "Your Diras sign-in code");
    assert.match(text, /482917/);
    assert.match(text, /10 minutes/);
    assert.doesNotMatch(text, /trxref|cs_live|reference/i);
    assert.doesNotMatch(otpEmailHtml("482917"), /<!doctype html>/i);
    assert.match(otpEmailHtml("482917"), /482917/);
  });
});
