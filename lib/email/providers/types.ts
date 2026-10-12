/** Shared types for email providers. */

export type EmailMessage = {
  /** Display-name + address, e.g. "Diras <hello@diras.app>". */
  from: string;
  /** Bare recipient address. */
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailProviderName = "resend" | "mailchannels";

export type EmailSendResult = {
  ok: boolean;
  provider: EmailProviderName;
  /** HTTP status or error code, for logs. */
  status?: number;
  /** Provider response id, for support lookups. */
  messageId?: string;
  /** Error message on failure. */
  error?: string;
};

export type EmailProvider = {
  name: EmailProviderName;
  /** True if the provider is configured (env vars present). */
  configured: () => boolean;
  /** Send an email. Should NOT throw on HTTP failure — return ok:false instead. */
  send: (msg: EmailMessage) => Promise<EmailSendResult>;
};
