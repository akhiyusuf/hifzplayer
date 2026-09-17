import { originOf, splitList } from "../host/origins.ts";

/**
 * Origins allowed to present a Clerk session JWT (`azp`).
 * Omitting this in production weakens CSRF / subdomain-cookie checks.
 */
export function clerkAuthorizedParties(): string[] | undefined {
  const parties = new Set<string>();
  const app = originOf(process.env.NEXT_PUBLIC_APP_URL);
  if (app) parties.add(app);
  for (const extra of splitList(process.env.CLERK_AUTHORIZED_PARTIES)) {
    const origin = originOf(extra);
    if (origin) parties.add(origin);
  }
  if (process.env.NODE_ENV !== "production") {
    parties.add("http://localhost:3000");
  }
  if (!parties.size) return undefined;
  return [...parties];
}
