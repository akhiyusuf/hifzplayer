/** Home greeting. Salaam stays; the given name comes from the signed-in account. */

export const SALAAM = "Assalamu alaikum";

/** Heading when there is no signed-in name yet. */
export const GUEST_NAME = "Reader";

export function givenNameFromAccount(
  user:
    | {
        firstName?: string | null;
        fullName?: string | null;
        username?: string | null;
      }
    | null
    | undefined,
): string {
  const first = (user?.firstName || "").trim();
  if (first) return first.split(/\s+/)[0] || GUEST_NAME;
  const full = (user?.fullName || "").trim();
  if (full) return full.split(/\s+/)[0] || GUEST_NAME;
  const un = (user?.username || "").trim();
  if (un && !un.includes("@") && un.length <= 24) return un;
  return GUEST_NAME;
}
