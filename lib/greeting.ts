/** Home greeting. Salaam stays; the given name comes from the signed-in account. */

export const SALAAM = "Assalamu alaikum";

/** Heading when there is no signed-in name yet. */
export const GUEST_NAME = "Reader";

/** localStorage key for the Clerk sign-in we already greeted. */
export const GREETED_SIGN_IN_KEY = "hifz.greeted.signIn";

/** Greet only if this sign-in (or new account) is still fresh. */
export const POST_AUTH_GREET_WINDOW_MS = 15 * 60 * 1000;

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

export type PostAuthGreetingKind = "login" | "signup";

export type PostAuthGreetingTrigger =
  | { greet: true; kind: PostAuthGreetingKind; key: string }
  | { greet: false };

function asTime(value: Date | string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Fire a salaam once after Clerk login or sign-up.
 * Already-authed sessions (old lastSignInAt) and a sign-in we already greeted stay quiet.
 */
export function postAuthGreetingTrigger(input: {
  userId: string | null | undefined;
  lastSignInAt: Date | string | number | null | undefined;
  createdAt: Date | string | number | null | undefined;
  greetedFor: string | null | undefined;
  now?: number;
}): PostAuthGreetingTrigger {
  const userId = (input.userId || "").trim();
  if (!userId) return { greet: false };

  const now = input.now ?? Date.now();
  const signedInAt = asTime(input.lastSignInAt);
  const createdAt = asTime(input.createdAt);
  const eventAt = signedInAt ?? createdAt;
  if (eventAt == null) return { greet: false };
  if (eventAt > now + 60_000) return { greet: false };
  if (now - eventAt > POST_AUTH_GREET_WINDOW_MS) return { greet: false };

  const key = `${userId}:${signedInAt ?? createdAt}`;
  if (input.greetedFor === key) return { greet: false };

  const isSignup =
    createdAt != null && now - createdAt <= POST_AUTH_GREET_WINDOW_MS;
  return { greet: true, kind: isSignup ? "signup" : "login", key };
}

/** Toast copy: salaam (and Plus, when that line is passed in), then the given name. */
export function postAuthGreetingLine(name: string, salaam = SALAAM): string {
  const who = (name || "").trim();
  if (!who || who === GUEST_NAME) return salaam;
  return `${salaam}, ${who}`;
}

export function readGreetedSignIn(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(GREETED_SIGN_IN_KEY);
  } catch {
    return null;
  }
}

export function writeGreetedSignIn(key: string): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(GREETED_SIGN_IN_KEY, key);
  } catch {
    /* private mode */
  }
}
