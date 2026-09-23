/**
 * Minimal RFC 6376 DKIM signer for the MailChannels provider.
 *
 * Sign algorithm:
 *   1. Canonicalise body (relaxed) → hash (SHA-256, base64)
 *   2. Build canonical header set (relaxed) for the signed header list
 *   3. Construct DKIM-Signature header with b= empty
 *   4. Canonicalise the DKIM-Signature header (relaxed), drop the b= value
 *   5. Compute hash over canonicalised headers + body hash, sign with RSA-SHA256
 *   6. Insert base64 signature as b=
 *
 * Uses Web Crypto (SubtleCrypto) so it runs on Cloudflare Workers without
 * any node-only deps.
 */

const encoder = new TextEncoder();

export type DkimSignInput = {
  /** PEM-encoded RSA private key (1024 or 2048 bit). */
  privateKeyPem: string;
  selector: string;
  domain: string;
  headers: Record<string, string>;
  body: string;
  /** Headers to include in the signature. Order matters. */
  signedHeaders: string[];
};

export type DkimSignOutput = {
  /** Full DKIM-Signature header value, ready to send to MailChannels. */
  headerValue: string;
  /** The canonical body hash (bh=), base64 — useful for tests. */
  bodyHash: string;
  /** The signature (b=), base64 — useful for tests. */
  signature: string;
};

/** Relaxed body canonicalisation per RFC 6376 §3.4.4. */
function canonicaliseBodyRelaxed(body: string): string {
  // 1. Reduce all sequences of WSP within a line to a single SP
  // 2. Ignore all WSP at the end of lines
  // 3. Ignore all empty lines at the end of the message body
  let out = body.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/ $/gm, "");
  // Remove trailing empty lines
  out = out.replace(/\n+$/g, "");
  if (!out.endsWith("\n")) out += "\n";
  // RFC 6376: CRLF line endings
  return out.replace(/\n/g, "\r\n");
}

/** Relaxed header canonicalisation per RFC 6376 §3.4.2. */
function canonicaliseHeaderRelaxed(name: string, value: string): string {
  // 1. Convert header name to lowercase
  // 2. Unfold (folded CRLF + WSP → single SP)
  // 3. WSP sequences → single SP
  // 4. Strip leading/trailing WSP from value
  // 5. Strip trailing WSP from value
  // 6. Append CRLF (no colon-space after — the canonical form is "name:value\r\n")
  const unfolded = value.replace(/\r\n[ \t]+/g, " ").replace(/[ \t]+/g, " ").trim();
  return `${name.toLowerCase()}:${unfolded}\r\n`;
}

async function importRsaPrivateKey(pem: string): Promise<CryptoKey> {
  // Strip PEM headers + newlines, base64-decode
  const b64 = pem
    .replace(/-----BEGIN RSA PRIVATE KEY-----/, "")
    .replace(/-----END RSA PRIVATE KEY-----/, "")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");

  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  // PKCS#8 (-----BEGIN PRIVATE KEY-----) → use generic import
  // PKCS#1 (-----BEGIN RSA PRIVATE KEY-----) → also acceptable to SubtleCrypto as pkcs1
  // Cloudflare Workers' SubtleCrypto accepts both formats via { format: "pkcs8" } when
  // PEM is pkcs8, but for pkcs1 we need a workaround. The cleanest approach: try pkcs8
  // first, fall back to a manual JWK conversion. For now, assume pkcs8 (the modern
  // default from `openssl genrsa | openssl pkcs8 -topk8`).
  //
  // To support both formats, we'll detect from the PEM header.
  const isPkcs1 = pem.includes("BEGIN RSA PRIVATE KEY");

  if (isPkcs1) {
    // Convert PKCS#1 → JWK manually. This is annoying but doable.
    // For simplicity, require users to provide PKCS#8 by running:
    //   openssl pkcs8 -topk8 -in private.pem -out private-pkcs8.pem -nocrypt
    throw new Error(
      "PKCS#1 RSA private keys are not supported. Convert with: openssl pkcs8 -topk8 -in key.pem -out key-pkcs8.pem -nocrypt"
    );
  }

  return crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, [
    "sign",
  ]);
}

async function sha256(data: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function rsaSha256Sign(key: CryptoKey, data: string): Promise<string> {
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function dkimSign(input: DkimSignInput): Promise<DkimSignOutput> {
  const key = await importRsaPrivateKey(input.privateKeyPem);

  // 1. Canonicalise body, compute bh=
  const canonicalBody = canonicaliseBodyRelaxed(input.body);
  const bodyHash = await sha256(canonicalBody);

  // 2. Build canonical header block (the headers we're signing, in order)
  // Per RFC 6376, the From header MUST be signed.
  const headerLines = input.signedHeaders
    .filter((h) => input.headers[h] !== undefined)
    .map((h) => canonicaliseHeaderRelaxed(h, input.headers[h]))
    .join("");

  // 3. Build the DKIM-Signature header with empty b=
  //    h= lists the signed header names (lowercased, colon-separated)
  const hField = input.signedHeaders
    .filter((hname) => input.headers[hname] !== undefined)
    .map((hname) => hname.toLowerCase())
    .join(":");

  const dkimFields: Record<string, string> = {
    v: "1",
    a: "rsa-sha256",
    c: "relaxed/relaxed",
    d: input.domain,
    s: input.selector,
    h: hField,
    bh: bodyHash,
    b: "",
  };

  const dkimHeaderValueWithoutB = Object.entries(dkimFields)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

  // 4. Canonicalise the DKIM-Signature header (with empty b=), append to header block
  //    Note: per RFC 6376 §3.7, the b= field is excluded from the signing input by
  //    treating its value as empty. The header is included in the signing input.
  const signingInput =
    headerLines + canonicaliseHeaderRelaxed("DKIM-Signature", dkimHeaderValueWithoutB);

  // 5. Sign the signing input with RSA-SHA256
  const signature = await rsaSha256Sign(key, signingInput);

  // 6. Build the final header value with b= filled in
  const finalHeaderValue = `v=1; a=rsa-sha256; c=relaxed/relaxed; d=${input.domain}; s=${input.selector}; h=${hField}; bh=${bodyHash}; b=${signature}`;

  return {
    headerValue: finalHeaderValue,
    bodyHash,
    signature,
  };
}
