import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TERMS_VERSION,
  PRIVACY_VERSION,
  currentLegalAccept,
  parseLegalAccept,
  isLegalCurrent,
  publicLegal,
  legalReturnPath,
  agreeHref,
} from "./legal.ts";

describe("legal accept record", () => {
  it("treats the current versions as accepted", () => {
    const accept = currentLegalAccept("2026-09-13T12:00:00.000Z");
    assert.equal(accept.terms, TERMS_VERSION);
    assert.equal(accept.privacy, PRIVACY_VERSION);
    assert.equal(isLegalCurrent(accept), true);
    assert.equal(publicLegal(accept).accepted, true);
    assert.equal("email" in publicLegal(accept), false);
  });

  it("rejects an old or incomplete record", () => {
    assert.equal(isLegalCurrent(null), false);
    assert.equal(isLegalCurrent(parseLegalAccept({ terms: "2019-01-01", privacy: PRIVACY_VERSION, at: "2026-09-13T00:00:00.000Z" })), false);
    assert.equal(parseLegalAccept({ terms: TERMS_VERSION, privacy: PRIVACY_VERSION, at: "not-a-date" }), null);
    assert.equal(parseLegalAccept({ terms: TERMS_VERSION }), null);
  });

  it("reads nested Clerk metadata without taking an email", () => {
    const accept = parseLegalAccept({
      dirasLegal: { terms: TERMS_VERSION, privacy: PRIVACY_VERSION, at: "2026-09-13T12:00:00.000Z", email: "secret@example.com" },
    });
    assert.equal(isLegalCurrent(accept), true);
    assert.equal(accept && "email" in accept, false);
  });
});

describe("agree return path", () => {
  it("stays on-site and does not loop on /agree", () => {
    assert.equal(legalReturnPath("/pricing"), "/pricing");
    assert.equal(legalReturnPath("/agree?next=/pricing"), "/");
    assert.equal(legalReturnPath("https://evil.example"), "/");
    assert.equal(agreeHref("/pricing"), "/agree?next=%2Fpricing");
  });
});
