import { emailForUser, markPlusWelcomeSent, plusWelcomeAlreadySent } from "@/lib/auth/plus";
import { logBillingEvent } from "@/lib/billing/analytics";
import type { Entitlement } from "@/lib/billing/entitlement";
import { APP_NAME } from "@/lib/brand";
import { mailchannelsProvider } from "./providers/mailchannels";
import { resendProvider, resendDefaultFrom } from "./providers/resend";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./providers/types";
import { giftNoticeHtml, giftNoticeSubject, giftNoticeText } from "./gift-notice";
import { otpEmailHtml, otpEmailSubject, otpEmailText } from "./otp";
import { plusWelcomeHtml, plusWelcomeSubject, plusWelcomeText } from "./plus-welcome";

function emailFrom() {
  return process.env.EMAIL_FROM || resendDefaultFrom() || `${APP_NAME} <hello@diras.app>`;
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

async function destination(ent: Entitlement): Promise<string | null> {
  const direct = (ent.email || "").trim().toLowerCase();
  if (looksLikeEmail(direct)) return direct;
  if (ent.userId) return emailForUser(ent.userId);
  return null;
}

/**
 * Providers tried in order. MailChannels is primary (uncapped, free for
 * Cloudflare Workers — no daily limit, important for viral spikes in password
 * resets or Plus confirmations). Resend is fallback if MailChannels is down
 * or not configured. If neither is configured, the router logs and skips.
 */
const providers: EmailProvider[] = [mailchannelsProvider, resendProvider];

/**
 * Try each configured provider in order. Returns the first successful result,
 * or the last failure if all providers fail.
 */
async function deliverWithFallback(msg: EmailMessage): Promise<EmailSendResult> {
  const attempts: EmailSendResult[] = [];
  for (const provider of providers) {
    if (!provider.configured()) continue;
    const result = await provider.send(msg);
    attempts.push(result);
    if (result.ok) return result;
    // Log the failure so we can see which provider failed and why
    console.warn(
      JSON.stringify({
        event: "diras.email",
        provider: result.provider,
        status: result.status,
        reason: result.error || "unknown",
        next:
          attempts.length < providers.filter((p) => p.configured()).length ? "fallback" : "exhausted",
      }),
    );
  }
  if (attempts.length === 0) {
    return { ok: false, provider: "resend", error: "no provider configured" };
  }
  return attempts[attempts.length - 1];
}

/** Send the Diras Plus welcome email. */
async function deliver(to: string, ent: Entitlement): Promise<EmailSendResult> {
  const input = {
    planId: ent.planId,
    regionId: ent.regionId,
    processor: ent.processor,
    until: ent.until,
  };
  return deliverWithFallback({
    from: emailFrom(),
    to,
    subject: plusWelcomeSubject(),
    text: plusWelcomeText(input),
    html: plusWelcomeHtml(input),
  });
}

export async function sendGiftNotice(opts: {
  to: string;
  existingAccount: boolean;
  alreadyPlus?: boolean;
  stacked?: boolean;
  keptLifetime?: boolean;
  planId?: string;
  signUpUrl: string;
}) {
  const to = opts.to.trim().toLowerCase();
  if (!looksLikeEmail(to)) return;
  if (!providers.some((p) => p.configured())) {
    logBillingEvent({ type: "gift_failed", reason: "no_provider" });
    return;
  }
  const input = {
    existingAccount: opts.existingAccount,
    alreadyPlus: opts.alreadyPlus,
    stacked: opts.stacked,
    keptLifetime: opts.keptLifetime,
    planId: opts.planId,
    signUpUrl: opts.signUpUrl,
  };
  const result = await deliverWithFallback({
    from: emailFrom(),
    to,
    subject: giftNoticeSubject(input),
    text: giftNoticeText(input),
    html: giftNoticeHtml(input),
  });
  if (!result.ok) {
    logBillingEvent({ type: "gift_failed", reason: result.error || "send_failed" });
    return;
  }
  logBillingEvent({ type: "welcome_sent", reason: `gift_notice:${result.provider}`, ok: true });
}

export async function sendOtpCode(to: string, code: string) {
  const address = to.trim().toLowerCase();
  if (!looksLikeEmail(address)) throw new Error("Invalid email");
  if (!providers.some((p) => p.configured())) throw new Error("Email is not configured");
  const result = await deliverWithFallback({
    from: emailFrom(),
    to: address,
    subject: otpEmailSubject(),
    text: otpEmailText(code),
    html: otpEmailHtml(code),
  });
  if (!result.ok) {
    throw new Error(`Email send failed (${result.provider}): ${result.error}`);
  }
}

/** Never throws — Plus grant must not fail because mail is down. */
export async function sendPlusWelcome(ent: Entitlement) {
  if (ent.planId === "trial" || ent.processor === "trial") {
    logBillingEvent({
      type: "welcome_skipped",
      processor: ent.processor,
      planId: ent.planId,
      regionId: ent.regionId,
      reason: "trial",
      hasUserId: Boolean(ent.userId),
      accountId: ent.userId,
    });
    return;
  }
  const to = await destination(ent);
  if (!to) {
    logBillingEvent({
      type: "welcome_skipped",
      processor: ent.processor,
      planId: ent.planId,
      regionId: ent.regionId,
      reason: "no_email",
      hasUserId: Boolean(ent.userId),
      accountId: ent.userId,
    });
    return;
  }
  if (ent.userId && (await plusWelcomeAlreadySent(ent.userId, ent.ref))) {
    logBillingEvent({
      type: "welcome_skipped",
      processor: ent.processor,
      planId: ent.planId,
      regionId: ent.regionId,
      reason: "already_sent",
      hasUserId: true,
      accountId: ent.userId,
    });
    return;
  }
  if (!providers.some((p) => p.configured())) {
    logBillingEvent({
      type: "welcome_skipped",
      processor: ent.processor,
      planId: ent.planId,
      regionId: ent.regionId,
      reason: "no_provider",
      hasUserId: Boolean(ent.userId),
      accountId: ent.userId,
    });
    return;
  }
  try {
    const result = await deliver(to, ent);
    if (result.ok) {
      if (ent.userId) await markPlusWelcomeSent(ent.userId, ent.ref);
      logBillingEvent({
        type: "welcome_sent",
        ok: true,
        processor: ent.processor,
        planId: ent.planId,
        regionId: ent.regionId,
        hasUserId: Boolean(ent.userId),
        accountId: ent.userId,
        reason: `provider:${result.provider}`,
      });
    } else {
      logBillingEvent({
        type: "welcome_failed",
        ok: false,
        processor: ent.processor,
        planId: ent.planId,
        regionId: ent.regionId,
        hasUserId: Boolean(ent.userId),
        accountId: ent.userId,
        reason: result.error,
      });
    }
  } catch {
    logBillingEvent({
      type: "welcome_failed",
      ok: false,
      processor: ent.processor,
      planId: ent.planId,
      regionId: ent.regionId,
      hasUserId: Boolean(ent.userId),
      accountId: ent.userId,
    });
  }
}
