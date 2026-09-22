import { APP_NAME, APP_TAGLINE, CONTACT_EMAIL } from "../brand.ts";
import { renderEmailHtml } from "./template.ts";

/** Sign-up welcome email — sent once when a new account is verified. */

export function signUpWelcomeSubject() {
  return `Welcome to ${APP_NAME}`;
}

export function signUpWelcomeText(input: { name?: string | null }) {
  const greeting = input.name?.trim() ? `Assalamu alaikum ${input.name.trim()} —` : "Assalamu alaikum —";
  return [
    `${greeting} your ${APP_NAME} account is ready.`,
    "",
    `${APP_NAME} is ${APP_TAGLINE}. Quran reading, audio, translation, and tajweed are always free. Sign in on any device with this email and your password.`,
    "",
    "A few things to try first:",
    "• Open Al-Fatiha and tap a word to hear it.",
    "• Try Focus view on a surah you are memorising.",
    "• Open Settings to pick a reciter and a colour theme.",
    "",
    `Need help? Reply to this email or write to ${CONTACT_EMAIL}.`,
    "",
    `— ${APP_NAME}`,
  ].join("\n");
}

export function signUpWelcomeHtml(input: { name?: string | null }) {
  const greeting = input.name?.trim()
    ? `Assalamu alaikum ${input.name.trim()} —`
    : "Assalamu alaikum —";
  return renderEmailHtml({
    preheader: `Your ${APP_NAME} account is ready`,
    heading: "Your account is ready",
    bodyHtml: `<p style="margin:0 0 16px">${greeting} your <strong>${APP_NAME}</strong> account is ready.</p><p style="margin:0 0 16px">${APP_NAME} is ${APP_TAGLINE}. Quran reading, audio, translation, and tajweed are always free. Sign in on any device with this email and your password.</p><p style="margin:0 0 8px"><strong>A few things to try first:</strong></p><p style="margin:0 0 4px">• Open Al-Fatiha and tap a word to hear it.</p><p style="margin:0 0 4px">• Try Focus view on a surah you are memorising.</p><p style="margin:0 0 16px">• Open Settings to pick a reciter and a colour theme.</p>`,
    cta: { label: "Open Diras", url: "https://diras.app/home" },
  });
}
