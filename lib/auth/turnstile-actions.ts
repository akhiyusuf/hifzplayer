/** Stable Turnstile actions. Letters, numbers, underscores, hyphens; 1–32 chars. */
export const TURNSTILE_ACTIONS = {
  login: "login",
  signup: "signup",
  resetRequest: "reset-request",
  passwordReset: "password-reset",
  verifyEmail: "verify-email",
} as const;

export type TurnstileAction = (typeof TURNSTILE_ACTIONS)[keyof typeof TURNSTILE_ACTIONS];

const ACTIONS = new Set<string>(Object.values(TURNSTILE_ACTIONS));

export function isTurnstileAction(value: string): value is TurnstileAction {
  return ACTIONS.has(value);
}
