import { clerkClient } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/auth/config";
import {
  currentLegalAccept,
  isLegalCurrent,
  parseLegalAccept,
  type LegalAccept,
} from "@/lib/legal";

type ClerkPrivate = {
  hifzLegal?: unknown;
};

export async function legalForUser(userId: string): Promise<LegalAccept | null> {
  if (!clerkConfigured() || !userId) return null;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return parseLegalAccept((user.privateMetadata as ClerkPrivate | undefined)?.hifzLegal);
  } catch {
    return null;
  }
}

export async function userHasCurrentLegal(userId: string): Promise<boolean> {
  return isLegalCurrent(await legalForUser(userId));
}

export async function saveLegalAccept(userId: string, accept: LegalAccept = currentLegalAccept()) {
  if (!clerkConfigured() || !userId) return;
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: {
      hifzLegal: {
        terms: accept.terms,
        privacy: accept.privacy,
        at: accept.at,
      },
    },
  });
}

export function legalFromPrivateMetadata(raw: unknown): LegalAccept | null {
  if (!raw || typeof raw !== "object") return null;
  return parseLegalAccept((raw as ClerkPrivate).hifzLegal ?? raw);
}
