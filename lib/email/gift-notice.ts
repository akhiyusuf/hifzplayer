import { APP_NAME, CONTACT_EMAIL, PLUS_NAME } from "../brand.ts";

export type GiftNoticeInput = {
  existingAccount: boolean;
  signUpUrl: string;
};

export function giftNoticeSubject() {
  return `Someone gifted you ${PLUS_NAME}`;
}

export function giftNoticeText(input: GiftNoticeInput) {
  const how = input.existingAccount
    ? `Sign in to ${APP_NAME} with this same email — Google is fine if that Google account uses this address.`
    : `Create a ${APP_NAME} account with this same email. Google is fine if that Google account uses this address. You do not need a password if you use Google.`;

  return [
    `Assalamu alaikum — someone just gifted you ${PLUS_NAME}.`,
    "",
    `${PLUS_NAME} unlocks Focus (Drill, Masked, Relay), occasion lists, and extra word repeats. Quran reading stays free either way.`,
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
