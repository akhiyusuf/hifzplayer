import { NextResponse } from "next/server";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function badRequest(error: string) {
  return json({ error }, 400);
}

export function serviceUnavailable(error: string, extra?: Record<string, unknown>) {
  return json({ error, ...extra }, 503);
}

export function emailLooksValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}
