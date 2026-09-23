import { PLUS_NAME } from "./brand.ts";

/** Guest Settings row — Plus is tied to an account, not this browser. */
export function accountGuestCopy() {
  return `Sign in so ${PLUS_NAME} follows you, not just this browser`;
}

/** Signed-in Settings row — /account is where sign-out lives on a phone. */
export function accountSignedInCopy() {
  return "Plan, account ID, and sign out";
}

/** `null` while Clerk is still loading — never flash the guest line at a signed-in reader. */
export function accountRowCopy(signedIn: boolean | null) {
  if (signedIn == null) return "";
  return signedIn ? accountSignedInCopy() : accountGuestCopy();
}
