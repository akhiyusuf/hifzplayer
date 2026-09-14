import { safePath } from "./nav.ts";

/** Bump these when the usage or privacy page changes in a material way. */
export const TERMS_VERSION = "2026-09-13";
export const PRIVACY_VERSION = "2026-09-13";

export type LegalAccept = {
  terms: string;
  privacy: string;
  at: string;
};

export function currentLegalAccept(at = new Date().toISOString()): LegalAccept {
  return { terms: TERMS_VERSION, privacy: PRIVACY_VERSION, at };
}

export function parseLegalAccept(raw: unknown): LegalAccept | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const nested =
    rec.dirasLegal && typeof rec.dirasLegal === "object" && !Array.isArray(rec.dirasLegal)
      ? (rec.dirasLegal as Record<string, unknown>)
      : rec.hifzLegal && typeof rec.hifzLegal === "object" && !Array.isArray(rec.hifzLegal)
        ? (rec.hifzLegal as Record<string, unknown>)
        : rec;
  const terms = typeof nested.terms === "string" ? nested.terms : "";
  const privacy = typeof nested.privacy === "string" ? nested.privacy : "";
  const at = typeof nested.at === "string" ? nested.at : "";
  if (!terms || !privacy || !at) return null;
  if (Number.isNaN(Date.parse(at))) return null;
  return { terms, privacy, at };
}

export function isLegalCurrent(accept: LegalAccept | null | undefined): boolean {
  return Boolean(accept && accept.terms === TERMS_VERSION && accept.privacy === PRIVACY_VERSION);
}

export function publicLegal(accept: LegalAccept | null) {
  if (!accept) {
    return { accepted: false as const, terms: null, privacy: null, at: null };
  }
  return {
    accepted: isLegalCurrent(accept),
    terms: accept.terms,
    privacy: accept.privacy,
    at: accept.at,
  };
}

/** After sign-in, send people to /agree then onward. Never bounce /agree to itself. */
export function legalReturnPath(path: string | string[] | undefined) {
  const next = safePath(path, "/");
  if (next === "/agree" || next.startsWith("/agree?")) return "/";
  return next;
}

export function agreeHref(next: string) {
  const path = legalReturnPath(next);
  return `/agree?next=${encodeURIComponent(path)}`;
}
