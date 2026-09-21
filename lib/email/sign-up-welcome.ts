import { APP_NAME, APP_TAGLINE, CONTACT_EMAIL } from "../brand.ts";

/** Sign-up welcome email — sent once when a new account is created. */

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
    `If you ever get stuck, reply to this email or write to ${CONTACT_EMAIL}.`,
    "",
    `— ${APP_NAME}`,
  ].join("\n");
}

export function signUpWelcomeHtml(input: { name?: string | null }) {
  const greeting = input.name?.trim()
    ? `Assalamu alaikum ${input.name.trim()} —`
    : "Assalamu alaikum —";
  return [
    `<p>${greeting} your <strong>${APP_NAME}</strong> account is ready.</p>`,
    `<p>${APP_NAME} is ${APP_TAGLINE}. Quran reading, audio, translation, and tajweed are always free. Sign in on any device with this email and your password.</p>`,
    `<p>A few things to try first:</p>`,
    `<ul style="padding-left:20px">`,
    `<li>Open Al-Fatiha and tap a word to hear it.</li>`,
    `<li>Try Focus view on a surah you are memorising.</li>`,
    `<li>Open Settings to pick a reciter and a colour theme.</li>`,
    `</ul>`,
    `<p>If you ever get stuck, reply to this email or write to <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>`,
    `<p>— ${APP_NAME}</p>`,
  ].join("");
}
