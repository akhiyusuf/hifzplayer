import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { otpEmailHtml, otpEmailSubject, otpEmailText } from "./otp.ts";

describe("password-reset OTP email", () => {
  it("names Diras and the code without sounding like a receipt", () => {
    const text = otpEmailText("482917");
    assert.equal(otpEmailSubject(), "Your Diras password code");
    assert.match(text, /482917/);
    assert.match(text, /10 minutes/);
    assert.doesNotMatch(text, /trxref|cs_live|reference/i);
    assert.match(otpEmailHtml("482917"), /482917/);
    // The OTP email is now a full HTML document (email template) — verify it
    // includes the Diras brand + the support prompt.
    assert.match(otpEmailHtml("482917"), /Diras/);
    assert.match(otpEmailHtml("482917"), /support@diras\.app/);
  });
});
