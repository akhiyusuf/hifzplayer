import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { resendProvider } from "./resend.ts";

const originalFetch = globalThis.fetch;

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

describe("resend provider", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    delete process.env.RESEND_FROM;
  });
  afterEach(restoreFetch);

  it("is not configured when RESEND_API_KEY is unset", () => {
    assert.equal(resendProvider.configured(), false);
  });

  it("is configured when RESEND_API_KEY is set", () => {
    process.env.RESEND_API_KEY = "re_test_key";
    assert.equal(resendProvider.configured(), true);
  });

  it("returns ok:false when API key is missing", async () => {
    const result = await resendProvider.send({
      from: "Diras <hello@diras.app>",
      to: "user@example.com",
      subject: "Test",
      text: "body",
    });
    assert.equal(result.ok, false);
    assert.equal(result.provider, "resend");
    assert.match(result.error || "", /RESEND_API_KEY/);
  });

  it("returns ok:true and parses the message id on a 200 response", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockFetch(200, JSON.stringify({ id: "re-message-id-123" }));

    const result = await resendProvider.send({
      from: "Diras <hello@diras.app>",
      to: "user@example.com",
      subject: "Test",
      text: "body",
      html: "<p>body</p>",
    });
    assert.equal(result.ok, true);
    assert.equal(result.provider, "resend");
    assert.equal(result.messageId, "re-message-id-123");
  });

  it("returns ok:false with status and error on a 4xx response", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockFetch(422, JSON.stringify({ message: "invalid from address" }));

    const result = await resendProvider.send({
      from: "Bad <not-an-email>",
      to: "user@example.com",
      subject: "Test",
      text: "body",
    });
    assert.equal(result.ok, false);
    assert.equal(result.provider, "resend");
    assert.equal(result.status, 422);
    assert.match(result.error || "", /422/);
  });

  it("returns ok:false on network errors", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    globalThis.fetch = (async () => {
      throw new Error("ECONNRESET");
    }) as typeof fetch;

    const result = await resendProvider.send({
      from: "Diras <hello@diras.app>",
      to: "user@example.com",
      subject: "Test",
      text: "body",
    });
    assert.equal(result.ok, false);
    assert.match(result.error || "", /ECONNRESET/);
  });
});
