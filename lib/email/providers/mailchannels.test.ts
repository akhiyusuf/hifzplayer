import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { generateKeyPairSync } from "node:crypto";
import { mailchannelsProvider } from "./mailchannels.ts";

const originalFetch = globalThis.fetch;

function makeTestKeyPairPem() {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 1024,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return privateKey;
}

function mockFetch(status: number, body: string, headers: Record<string, string> = {}) {
  globalThis.fetch = (async () =>
    new Response(body, {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    })) as typeof fetch;
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

describe("mailchannels provider", () => {
  beforeEach(() => {
    delete process.env.MAILCHANNELS_DKIM_PRIVATE_KEY;
    delete process.env.MAILCHANNELS_DKIM_SELECTOR;
    delete process.env.MAILCHANNELS_DKIM_DOMAIN;
    delete process.env.EMAIL_FROM;
  });
  afterEach(restoreFetch);

  it("is not configured when env vars are missing", () => {
    assert.equal(mailchannelsProvider.configured(), false);
  });

  it("is configured when private key and domain are set", () => {
    process.env.MAILCHANNELS_DKIM_PRIVATE_KEY = makeTestKeyPairPem();
    process.env.MAILCHANNELS_DKIM_DOMAIN = "diras.app";
    assert.equal(mailchannelsProvider.configured(), true);
  });

  it("returns ok:false when DKIM env vars are missing", async () => {
    const result = await mailchannelsProvider.send({
      from: "Diras <hello@diras.app>",
      to: "user@example.com",
      subject: "Test",
      text: "body",
    });
    assert.equal(result.ok, false);
    assert.equal(result.provider, "mailchannels");
    assert.match(result.error || "", /DKIM/);
  });

  it("returns ok:true and captures X-Message-ID on a 202 response", async () => {
    process.env.MAILCHANNELS_DKIM_PRIVATE_KEY = makeTestKeyPairPem();
    process.env.MAILCHANNELS_DKIM_DOMAIN = "diras.app";
    process.env.MAILCHANNELS_DKIM_SELECTOR = "mailchannels";
    mockFetch(202, "", { "x-message-id": "mc-12345" });

    const result = await mailchannelsProvider.send({
      from: "Diras <hello@diras.app>",
      to: "user@example.com",
      subject: "Test",
      text: "body",
      html: "<p>body</p>",
    });
    assert.equal(result.ok, true);
    assert.equal(result.provider, "mailchannels");
    assert.equal(result.messageId, "mc-12345");
  });

  it("returns ok:false with status and error on a 401 response", async () => {
    process.env.MAILCHANNELS_DKIM_PRIVATE_KEY = makeTestKeyPairPem();
    process.env.MAILCHANNELS_DKIM_DOMAIN = "diras.app";
    process.env.MAILCHANNELS_DKIM_SELECTOR = "mailchannels";
    mockFetch(401, "Authorization Required");

    const result = await mailchannelsProvider.send({
      from: "Diras <hello@diras.app>",
      to: "user@example.com",
      subject: "Test",
      text: "body",
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 401);
    assert.match(result.error || "", /401/);
  });

  it("returns ok:false on network errors", async () => {
    process.env.MAILCHANNELS_DKIM_PRIVATE_KEY = makeTestKeyPairPem();
    process.env.MAILCHANNELS_DKIM_DOMAIN = "diras.app";
    process.env.MAILCHANNELS_DKIM_SELECTOR = "mailchannels";
    globalThis.fetch = (async () => {
      throw new Error("ECONNRESET");
    }) as typeof fetch;

    const result = await mailchannelsProvider.send({
      from: "Diras <hello@diras.app>",
      to: "user@example.com",
      subject: "Test",
      text: "body",
    });
    assert.equal(result.ok, false);
    assert.match(result.error || "", /ECONNRESET/);
  });
});
