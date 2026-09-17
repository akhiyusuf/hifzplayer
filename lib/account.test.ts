import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLUS_NAME } from "./brand.ts";
import { accountGuestCopy, accountRowCopy, accountSignedInCopy } from "./account.ts";

describe("account row copy", () => {
  it("asks a guest to sign in so Plus follows them", () => {
    assert.match(accountGuestCopy(), new RegExp(PLUS_NAME));
    assert.match(accountGuestCopy(), /Sign in/);
    assert.equal(accountRowCopy(false), accountGuestCopy());
  });

  it("points a signed-in reader at plan and sign-out, not the guest line", () => {
    assert.match(accountSignedInCopy(), /sign out/i);
    assert.doesNotMatch(accountSignedInCopy(), /Sign in so/);
    assert.equal(accountRowCopy(true), accountSignedInCopy());
    assert.notEqual(accountRowCopy(true), accountRowCopy(false));
  });
});
