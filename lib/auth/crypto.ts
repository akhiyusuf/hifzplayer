import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { authSecret } from "./config.ts";

const scryptAsync = promisify(scrypt);

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

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scryptAsync(password, salt, 32)) as Buffer;
  return `scrypt:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [kind, salt, hash] = stored.split(":");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const key = (await scryptAsync(password, salt, 32)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== key.length) return false;
  return timingSafeEqual(expected, key);
}
