/** Password strength check — used by sign-up + password reset. */

export type PasswordStrength = {
  /** 0 (weak/empty) to 4 (strong). */
  score: 0 | 1 | 2 | 3 | 4;
  /** Short label for the meter. */
  label: "Too short" | "Weak" | "Fair" | "Good" | "Strong";
  /** True when the password is "Fair" or better — the submit threshold. */
  acceptable: boolean;
  /** Specific failure reasons (empty when acceptable). */
  reasons: string[];
};

/**
 * Score a password. The thresholds are intentionally simple — we are not trying
 * to enforce NIST-800-63B verbatim, just to stop "12345678" and "password".
 *
 * Rules:
 *   - 0 (Too short): fewer than 8 chars
 *   - 1 (Weak):      8+ chars but no letter, or no non-letter
 *   - 2 (Fair):      8+ chars with a letter AND a non-letter (digit/punct)
 *   - 3 (Good):      12+ chars with a letter AND a non-letter, OR 8+ chars with upper + lower + digit
 *   - 4 (Strong):    12+ chars with upper + lower + digit
 */
export function scorePassword(password: string): PasswordStrength {
  const pwd = password || "";
  const reasons: string[] = [];

  if (pwd.length < 8) {
    if (pwd.length > 0) reasons.push("Use at least 8 characters");
    return { score: 0, label: "Too short", acceptable: false, reasons };
  }

  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasDigit = /[0-9]/.test(pwd);
  const hasOther = /[^a-zA-Z0-9]/.test(pwd);
  const hasLetter = hasLower || hasUpper;
  const hasNonLetter = hasDigit || hasOther;

  if (!hasLetter) reasons.push("Add a letter");
  if (!hasNonLetter) reasons.push("Add a number or symbol");

  if (!hasLetter || !hasNonLetter) {
    return { score: 1, label: "Weak", acceptable: false, reasons };
  }

  // Fair: 8+ chars with letter + non-letter
  let score: 2 | 3 | 4 = 2;
  let label: "Fair" | "Good" | "Strong" = "Fair";

  // Good: 12+ chars with letter + non-letter, OR 8+ chars with upper + lower + digit
  if (pwd.length >= 12 || (hasUpper && hasLower && hasDigit)) {
    score = 3;
    label = "Good";
  }

  // Strong: 12+ chars with upper + lower + digit
  if (pwd.length >= 12 && hasUpper && hasLower && hasDigit) {
    score = 4;
    label = "Strong";
  }

  return { score, label, acceptable: true, reasons: [] };
}

/** True when the password passes the minimum bar for sign-up. */
export function isPasswordAcceptable(password: string): boolean {
  return scorePassword(password).acceptable;
}
