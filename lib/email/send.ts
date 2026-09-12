import { clerkEmailForUser, markPlusWelcomeSent, plusWelcomeAlreadySent } from "@/lib/auth/plus";
import { logBillingEvent } from "@/lib/billing/analytics";
import type { Entitlement } from "@/lib/billing/entitlement";
import { APP_NAME } from "@/lib/brand";
import { giftNoticeHtml, giftNoticeSubject, giftNoticeText } from "./gift-notice";
import { plusWelcomeHtml, plusWelcomeSubject, plusWelcomeText } from "./plus-welcome";

function resendApiKey() {
  return process.env.RESEND_API_KEY || "";
}

function emailFrom() {
  return process.env.EMAIL_FROM || process.env.RESEND_FROM || `${APP_NAME} <beth.t@example.com>`;
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

async function destination(ent: Entitlement): Promise<string | null> {
  const direct = (ent.email || "").trim().toLowerCase();
  if (looksLikeEmail(direct)) return direct;
  if (ent.userId) return clerkEmailForUser(ent.userId);
  return null;
}

async function deliver(to: string, ent: Entitlement) {
  const key = resendApiKey();
  const input = {
    planId: ent.planId,
    regionId: ent.regionId,
    processor: ent.processor,
    until: ent.until,
  };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "DirasBilling/1.0",
    },
    body: JSON.stringify({
      from: emailFrom(),
      to: [to],
      subject: plusWelcomeSubject(),
      text: plusWelcomeText(input),
      html: plusWelcomeHtml(input),
    }),
  });
  if (!res.ok) throw new Error(`Resend HTTP ${res.status}`);
}

export async function sendGiftNotice(opts: {
  to: string;
  existingAccount: boolean;
  signUpUrl: string;
}) {
  const to = opts.to.trim().toLowerCase();
  if (!looksLikeEmail(to)) return;
  const key = resendApiKey();
  if (!key) {
    logBillingEvent({ type: "gift_failed", reason: "no_provider" });
    return;
  }
  const input = { existingAccount: opts.existingAccount, signUpUrl: opts.signUpUrl };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "DirasBilling/1.0",
    },
    body: JSON.stringify({
      from: emailFrom(),
      to: [to],
      subject: giftNoticeSubject(),
      text: giftNoticeText(input),
      html: giftNoticeHtml(input),
    }),
  });
  if (!res.ok) throw new Error(`Resend HTTP ${res.status}`);
  logBillingEvent({ type: "welcome_sent", reason: "gift_notice", ok: true });
}

/** Never throws — Plus grant must not fail because mail is down. */
export async function sendPlusWelcome(ent: Entitlement) {
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
  if (!resendApiKey()) {
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
    await deliver(to, ent);
    if (ent.userId) await markPlusWelcomeSent(ent.userId, ent.ref);
    logBillingEvent({
      type: "welcome_sent",
      ok: true,
      processor: ent.processor,
      planId: ent.planId,
      regionId: ent.regionId,
      hasUserId: Boolean(ent.userId),
      accountId: ent.userId,
    });
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
