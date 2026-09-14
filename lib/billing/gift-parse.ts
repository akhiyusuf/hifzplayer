/** One paid gift checkout can cover this many recipients. */
export const GIFT_SEATS = 10;

export function parseGiftSeats(value: string | number | undefined) {
  const n = typeof value === "number" ? value : Number.parseInt(String(value || ""), 10);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, GIFT_SEATS);
}

export function joinGiftEmails(emails: string[]) {
  return parseGiftEmails(emails).join(",");
}

/** Split, trim, lowercase, drop empties. */
export function parseGiftEmails(raw: string | string[]): string[] {
  const chunks = Array.isArray(raw) ? raw : String(raw || "").split(/[\s,;]+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const chunk of chunks) {
    const email = chunk.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function validateGiftEmails(
  raw: string | string[],
  seats?: string | number,
): { emails: string[] } | { error: string } {
  const emails = parseGiftEmails(raw);
  if (emails.length === 0) return { error: "Add the email of each person you are gifting" };
  if (emails.length > GIFT_SEATS) {
    return { error: `You can gift up to ${GIFT_SEATS} people at once.` };
  }
  if (seats != null) {
    const want = parseGiftSeats(seats);
    if (emails.length !== want) {
      return {
        error: want === 1 ? "Add one email." : `Add ${want} emails — one for each person.`,
      };
    }
  }
  if (!emails.every(looksLikeEmail)) return { error: "Enter a valid email address" };
  return { emails };
}

export const GIFT_RECIPIENT_SELF = "That is your email. Use For me if Plus is for you.";

export type GiftRecipientKind = "ok" | "invite" | "self";

export function giftRecipientMessage(_kind: "self" = "self") {
  return GIFT_RECIPIENT_SELF;
}

/** Buyer cannot gift themselves. Missing accounts are still allowed — we email them to sign in. */
export function classifyGiftRecipient(opts: {
  buyerId?: string;
  buyerEmail?: string;
  recipientEmail: string;
  recipientUserId: string | null;
}): GiftRecipientKind {
  const buyerEmail = (opts.buyerEmail || "").trim().toLowerCase();
  const recipientEmail = opts.recipientEmail.trim().toLowerCase();
  if (buyerEmail && recipientEmail && buyerEmail === recipientEmail) return "self";
  if (opts.buyerId && opts.recipientUserId && opts.buyerId === opts.recipientUserId) return "self";
  if (!opts.recipientUserId) return "invite";
  return "ok";
}

export function giftFlag(value: string) {
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "gift";
}
