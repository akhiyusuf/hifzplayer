import { APP_NAME } from "../brand.ts";

export function otpEmailSubject() {
  return `Your ${APP_NAME} sign-in code`;
}

export function otpEmailText(code: string) {
  return [
    `Assalamu alaikum — your ${APP_NAME} sign-in code is ${code}.`,
    "",
    "It expires in 10 minutes. If you did not ask for this, ignore the email.",
  ].join("\n");
}

export function otpEmailHtml(code: string) {
  return `<p>Assalamu alaikum — your ${APP_NAME} sign-in code is <strong style="font-size:20px;letter-spacing:.12em">${code}</strong>.</p><p>It expires in 10 minutes. If you did not ask for this, ignore the email.</p>`;
}
