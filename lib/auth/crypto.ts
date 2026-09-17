import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { authSecret } from "./config.ts";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomId(prefix: string, bytes = 12) {
  return `${prefix}_${randomBytes(bytes).toString("hex")}`;
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function sixDigitCode() {
  return String(100000 + (randomBytes(4).readUInt32BE(0) % 900000));
}

export function hashSecretValue(value: string) {
  return sha256(`${authSecret()}:${value}`);
}

export function hashesEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
