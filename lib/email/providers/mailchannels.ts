/**
 * MailChannels provider — uses https://api.mailchannels.net/tx/v1/send
 *
 * MailChannels is free for Cloudflare Workers users and does not require a
 * per-account API key. Authentication is by DKIM-signing each message with
 * a private key whose public counterpart is published in the sender domain's
 * DNS as `<selector>._domainkey.<domain>` TXT record.
 *
 * Required env vars:
 *   MAILCHANNELS_DKIM_PRIVATE_KEY  — PEM-encoded RSA private key (1024-bit ok)
 *   MAILCHANNELS_DKIM_SELECTOR     — e.g. "mailchannels"
 *   MAILCHANNELS_DKIM_DOMAIN       — e.g. "diras.app"
 *
 * If any are missing, the provider is considered not configured and the
 * caller (usually the email router) will skip it.
 */

import { APP_NAME } from "../../brand.ts";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./types.ts";
import { dkimSign } from "./dkim.ts";

function privateKey() {
  return process.env.MAILCHANNELS_DKIM_PRIVATE_KEY || "";
}
function selector() {
  return process.env.MAILCHANNELS_DKIM_SELECTOR || "mailchannels";
}
function signingDomain() {
  return process.env.MAILCHANNELS_DKIM_DOMAIN || "";
}

function defaultFrom() {
  return process.env.EMAIL_FROM || `${APP_NAME} <hello@${signingDomain() || "diras.app"}>`;
}

/** Parse "Display Name <user@host>" into {name, address}. */
function parseFrom(from: string): { name: string; address: string } {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1] || APP_NAME, address: match[2] };
  return { name: APP_NAME, address: from };
}

export const mailchannelsProvider: EmailProvider = {
  name: "mailchannels",

  configured: () => Boolean(privateKey() && signingDomain()),

  async send(msg: EmailMessage): Promise<EmailSendResult> {
    const privKeyPem = privateKey();
    const domain = signingDomain();
    const sel = selector();
    if (!privKeyPem || !domain) {
      return { ok: false, provider: "mailchannels", error: "MailChannels DKIM env vars not set" };
    }

    const fromParsed = parseFrom(msg.from);

    // Build the MIME message body that gets DKIM-signed.
    // MailChannels accepts a JSON payload with content_* fields; we sign the
    // canonicalised text/html parts and add the DKIM-Signature header via
    // personalizations[].dkim_signature.
    const headers: Record<string, string> = {
      From: msg.from,
      To: msg.to,
      Subject: msg.subject,
      "MIME-Version": "1.0",
      "Message-ID": `<${crypto.randomUUID()}@${domain}>`,
      Date: new Date().toUTCString(),
    };

    let body: string;
    if (msg.html) {
      const boundary = "----=_DirasBoundary_" + crypto.randomUUID();
      headers["Content-Type"] = `multipart/alternative; boundary="${boundary}"`;
      body = [
        ``,
        `--${boundary}`,
        `Content-Type: text/plain; charset=utf-8`,
        `Content-Transfer-Encoding: 7bit`,
        ``,
        msg.text,
        ``,
        `--${boundary}`,
        `Content-Type: text/html; charset=utf-8`,
        `Content-Transfer-Encoding: 7bit`,
        ``,
        msg.html,
        ``,
        `--${boundary}--`,
        ``,
      ].join("\r\n");
    } else {
      headers["Content-Type"] = "text/plain; charset=utf-8";
      headers["Content-Transfer-Encoding"] = "7bit";
      body = `\r\n${msg.text}`;
    }

    // Compute DKIM signature over the canonicalised headers + body
    const dkimSignature = await dkimSign({
      privateKeyPem: privKeyPem,
      selector: sel,
      domain,
      headers,
      body,
      // Sign these headers per RFC 6376 + MailChannels recommendation
      signedHeaders: ["From", "To", "Subject", "Date", "Message-ID", "MIME-Version", "Content-Type"],
    });

    // MailChannels API payload
    // Docs: https://support.mailchannels.com/hc/en-us/articles/7120436888461
    const payload = {
      personalizations: [
        {
          to: [{ email: msg.to, name: "" }],
          from: { email: fromParsed.address, name: fromParsed.name },
          dkim_signature: dkimSignature.headerValue,
        },
      ],
      from: { email: fromParsed.address, name: fromParsed.name },
      subject: msg.subject,
      content: [
        { type: "text/plain", value: msg.text },
        ...(msg.html ? [{ type: "text/html", value: msg.html }] : []),
      ],
      headers,
    };

    try {
      const res = await fetch("https://api.mailchannels.net/tx/v1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "DirasBilling/1.0",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          ok: false,
          provider: "mailchannels",
          status: res.status,
          error: `MailChannels HTTP ${res.status}: ${body.slice(0, 200)}`,
        };
      }

      const messageId = res.headers.get("x-message-id") || undefined;
      return {
        ok: true,
        provider: "mailchannels",
        status: res.status,
        messageId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, provider: "mailchannels", error: `MailChannels fetch failed: ${message}` };
    }
  },
};

export { defaultFrom as mailchannelsDefaultFrom };
