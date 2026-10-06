import { APP_NAME, CONTACT_EMAIL } from "../brand.ts";
import { renderEmailHtml } from "./template.ts";

export function otpEmailSubject() {
  return `Your ${APP_NAME} password code`;
}

export function otpEmailText(code: string) {
  return [
    `Assalamu alaikum — your ${APP_NAME} password-reset code is ${code}.`,
    "",
    "It expires in 10 minutes. If you did not ask for this, ignore the email.",
    "",
    `Need help? Write to ${CONTACT_EMAIL}.`,
  ].join("\n");
}

export function otpEmailHtml(code: string) {
  return renderEmailHtml({
    preheader: `Your ${APP_NAME} password code is ${code}`,
    heading: "Reset your password",
    bodyHtml: `<p style="margin:0 0 16px">Assalamu alaikum — your password-reset code is:</p><p style="margin:0 0 16px;font-size:32px;font-weight:700;letter-spacing:0.12em;font-family:'Bricolage Grotesque','Inter',sans-serif;color:#e8590c">${code}</p><p style="margin:0 0 16px">It expires in 10 minutes. If you did not ask for this, ignore this email.</p>`,
  });
}
