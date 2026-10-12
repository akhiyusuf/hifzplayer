import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { dkimSign } from "./dkim.ts";

// Generate a test key pair using node's crypto (works in test runtime, not in Workers)
import { generateKeyPairSync } from "node:crypto";

function makeTestKeyPairPem(): { privateKeyPem: string; publicKeyPem: string } {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 1024,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { privateKeyPem: privateKey, publicKeyPem: publicKey };
}

describe("dkimSign", () => {
  it("produces a valid DKIM-Signature header value with all required fields", async () => {
    const keys = makeTestKeyPairPem();
    const headers = {
      From: "Diras <hello@diras.app>",
      To: "user@example.com",
      Subject: "Test",
      Date: "Mon, 01 Jan 2026 00:00:00 +0000",
      "Message-ID": "<test@diras.app>",
      "MIME-Version": "1.0",
      "Content-Type": "text/plain; charset=utf-8",
    };
    const body = "\r\nHello world\r\n";

    const result = await dkimSign({
      privateKeyPem: keys.privateKeyPem,
      selector: "mailchannels",
      domain: "diras.app",
      headers,
      body,
      signedHeaders: ["From", "To", "Subject", "Date", "Message-ID", "MIME-Version", "Content-Type"],
    });

    // Should have all required DKIM fields
    assert.match(result.headerValue, /v=1/);
    assert.match(result.headerValue, /a=rsa-sha256/);
    assert.match(result.headerValue, /c=relaxed\/relaxed/);
    assert.match(result.headerValue, /d=diras\.app/);
    assert.match(result.headerValue, /s=mailchannels/);
    assert.match(result.headerValue, /h=from:to:subject:date:message-id:mime-version:content-type/);
    assert.match(result.headerValue, /bh=[A-Za-z0-9+/=]+/);
    assert.match(result.headerValue, /b=[A-Za-z0-9+/=]+/);
    // bh= and b= should be non-empty base64
    assert.ok(result.bodyHash.length > 10, "body hash should be non-trivial");
    assert.ok(result.signature.length > 100, "signature should be a long base64 string");
  });

  it("canonicalises body in relaxed mode (trailing whitespace stripped)", async () => {
    const keys = makeTestKeyPairPem();
    const headers = {
      From: "Diras <hello@diras.app>",
      To: "u@e.com",
      Subject: "t",
    };
    // Two bodies that should canonicalise to the same thing
    const body1 = "\r\nHello world\r\n";
    const body2 = "\r\nHello  world   \r\n\r\n"; // extra space + trailing whitespace + empty lines

    const r1 = await dkimSign({
      privateKeyPem: keys.privateKeyPem,
      selector: "s",
      domain: "d.com",
      headers,
      body: body1,
      signedHeaders: ["From", "To", "Subject"],
    });
    const r2 = await dkimSign({
      privateKeyPem: keys.privateKeyPem,
      selector: "s",
      domain: "d.com",
      headers,
      body: body2,
      signedHeaders: ["From", "To", "Subject"],
    });
    // Body hashes should NOT be equal — body2 has trailing whitespace stripped but the inner
    // whitespace reduction differs (body1 has "Hello world", body2 has "Hello  world" which
    // reduces to "Hello world" — wait, body2 has double space which relaxed reduces to single).
    // Actually relaxed reduces all WSP runs to single SP. So "Hello  world" → "Hello world".
    // But body2 has trailing newlines that get stripped. So they SHOULD be equal.
    assert.equal(r1.bodyHash, r2.bodyHash, "relaxed canonicalisation should produce same hash for equivalent bodies");
  });

  it("rejects PKCS#1 keys with a helpful error message", async () => {
    // Generate PKCS#1 key
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 1024,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs1", format: "pem" },
    });
    await assert.rejects(
      () =>
        dkimSign({
          privateKeyPem: privateKey,
          selector: "s",
          domain: "d.com",
          headers: { From: "a@b.com" },
          body: "",
          signedHeaders: ["From"],
        }),
      /PKCS#1 RSA private keys are not supported/,
    );
  });
});
