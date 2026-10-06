/** Resend provider — wraps https://api.resend.com/emails. */

import { APP_NAME } from "../../brand.ts";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./types.ts";

function apiKey() {
  return process.env.RESEND_API_KEY || "";
}

function defaultFrom() {
  return process.env.EMAIL_FROM || process.env.RESEND_FROM || `${APP_NAME} <beth.t@example.com>`;
}

export const resendProvider: EmailProvider = {
  name: "resend",

  configured: () => Boolean(apiKey()),

  async send(msg: EmailMessage): Promise<EmailSendResult> {
    const key = apiKey();
    if (!key) {
      return { ok: false, provider: "resend", error: "RESEND_API_KEY is not set" };
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "DirasBilling/1.0",
        },
        body: JSON.stringify({
          from: msg.from,
          to: [msg.to],
          subject: msg.subject,
          text: msg.text,
          html: msg.html,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          ok: false,
          provider: "resend",
          status: res.status,
          error: `Resend HTTP ${res.status}: ${body.slice(0, 200)}`,
        };
      }

      const data = await res.json().catch(() => ({}));
      return {
        ok: true,
        provider: "resend",
        status: res.status,
        messageId: data?.id,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, provider: "resend", error: `Resend fetch failed: ${message}` };
    }
  },
};

export { defaultFrom as resendDefaultFrom };
