import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { GOOGLE_CONSENT_APP_NAME } from "../brand.ts";

describe("Google consent branding", () => {
  it("is Diras, not Cloudflare or Neon", () => {
    assert.equal(GOOGLE_CONSENT_APP_NAME, "Diras");
    assert.notEqual(GOOGLE_CONSENT_APP_NAME.toLowerCase(), "cloudflare");
    assert.notEqual(GOOGLE_CONSENT_APP_NAME.toLowerCase(), "neon");
  });

  it("tells the Google Cloud setup to use that App name", () => {
    const docs = readFileSync(new URL("../../docs/hosting-cloudflare.md", import.meta.url), "utf8");
    assert.match(docs, /App name: `Diras`/);
    assert.match(docs, /not Cloudflare, not Neon/);
  });
});
