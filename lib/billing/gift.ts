import { createHmac, timingSafeEqual } from "node:crypto";
import { billingSigningSecret } from "./env.ts";
import type { PaidPlanId, Processor, RegionId } from "./plans.ts";
import { isPaidPlanId, isRegionId } from "./plans.ts";

export {
  GIFT_SEATS,
  GIFT_RECIPIENT_SELF,
  classifyGiftRecipient,
  giftFlag,
  giftRecipientMessage,
  joinGiftEmails,
  parseGiftEmails,
  parseGiftSeats,
  validateGiftEmails,
  type GiftRecipientKind,
} from "./gift-parse.ts";

export type GiftClaim = {
  v: 1;
  planId: PaidPlanId;
  regionId: RegionId;
  processor: Exclude<Processor, "trial">;
  until: string | null;
  ref: string;
  buyerId: string;
};

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function sealGiftClaim(claim: GiftClaim) {
  const secret = billingSigningSecret();
  if (!secret) throw new Error("No billing signing secret is configured");
  const payload = encode(JSON.stringify(claim));
  return `${payload}.${sign(payload, secret)}`;
}

export function openGiftClaim(token: string | undefined | null): GiftClaim | null {
  if (!token) return null;
  const secret = billingSigningSecret();
  if (!secret) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!equal(sign(payload, secret), sig)) return null;
  try {
    const raw = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GiftClaim;
    if (raw.v !== 1 || !isPaidPlanId(raw.planId) || !isRegionId(raw.regionId)) return null;
    if (raw.processor !== "stripe" && raw.processor !== "paystack") return null;
    if (!raw.ref || !raw.buyerId) return null;
    return raw;
  } catch {
    return null;
  }
}
