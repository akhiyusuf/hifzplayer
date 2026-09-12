import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GUEST_NAME, SALAAM, givenNameFromAccount } from "./greeting.ts";

describe("home greeting", () => {
  it("uses the salaam, not a weekday or time of day", () => {
    assert.equal(SALAAM, "Assalamu alaikum");
    assert.doesNotMatch(SALAAM, /morning|afternoon|evening|Saturday|Monday/i);
  });

  it("prefers the given name from the account", () => {
    assert.equal(givenNameFromAccount({ firstName: "Yusuf", fullName: "Yusuf Ali" }), "Yusuf");
    assert.equal(givenNameFromAccount({ firstName: "  Maryam  " }), "Maryam");
  });

  it("falls back to Reader when there is no account name", () => {
    assert.equal(GUEST_NAME, "Reader");
    assert.equal(givenNameFromAccount(null), "Reader");
    assert.equal(givenNameFromAccount({}), "Reader");
    assert.equal(givenNameFromAccount({ firstName: "", fullName: "", username: "user@x.com" }), "Reader");
  });
});
