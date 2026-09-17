import { APP_NAME, CONTACT_EMAIL, PLUS_NAME } from "../brand.ts";

export type GiftNoticeInput = {
  existingAccount: boolean;
  alreadyPlus?: boolean;
  stacked?: boolean;
  keptLifetime?: boolean;
  planId?: string;
  signUpUrl: string;
};

function extraLabel(planId?: string) {
  if (planId === "annual") return "an extra year";
  if (planId === "monthly") return "an extra month";
  return "extra time";
}

export function giftNoticeSubject(input?: Pick<GiftNoticeInput, "alreadyPlus" | "stacked" | "keptLifetime">) {
  if (input?.alreadyPlus && input.stacked) return `Someone added extra time to your ${PLUS_NAME}`;
  return `Someone gifted you ${PLUS_NAME}`;
}

export function giftNoticeText(input: GiftNoticeInput) {
  const how = input.existingAccount
    ? `Sign in to ${APP_NAME} with this same email — we will email you a 6-digit code.`
    : `You have been granted ${PLUS_NAME}. Sign in or create a ${APP_NAME} account with this same email. We will email you a 6-digit code.`;

  const lead =
    input.existingAccount && input.keptLifetime
      ? `Assalamu alaikum — someone gifted you ${PLUS_NAME}. You already have lifetime ${PLUS_NAME} on this email, so your access stays lifetime.`
      : input.existingAccount && input.alreadyPlus && input.stacked
        ? `Assalamu alaikum — someone gifted you ${extraLabel(input.planId)} of ${PLUS_NAME}. You already had access on this account. This gift adds time on top of what you have — it does not replace it.`
        : `Assalamu alaikum — someone just gifted you ${PLUS_NAME}.`;

  return [
    lead,
    "",
    `${PLUS_NAME} unlocks Focus (Word Reps, Masked, Relay), occasion lists, and extra word repeats. Quran reading stays free either way.`,
    "",
    how,
    "",
    `Open this link with the gifted email: ${input.signUpUrl}`,
    "",
    "If you sign up with a different address, the gift will not attach.",
    "",
    `Questions: ${CONTACT_EMAIL}`,
  ].join("\n");
}

export function giftNoticeHtml(input: GiftNoticeInput) {
  const text = giftNoticeText(input);
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped.split("\n\n").map((block) => {
    const html = block.replace(/\n/g, "<br/>");
    return `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#242019">${html}</p>`;
  });
  return `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#faf8f3;font-family:Inter,system-ui,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:24px;background:#fff;border:1px solid #e4ddd0;border-radius:12px">
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#242019">${PLUS_NAME}</p>
    ${paragraphs.join("\n    ")}
  </div>
</body>
</html>`;
}
