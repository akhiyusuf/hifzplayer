import { NextResponse } from "next/server";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function badRequest(error: string) {
  return json({ error }, 400);
}

export function unauthorized(error: string, extra?: Record<string, unknown>) {
  return json({ error, ...extra }, 401);
}

export function serviceUnavailable(error: string, extra?: Record<string, unknown>) {
  return json({ error, ...extra }, 503);
}

export function processorFailed() {
  return json({ error: "Could not reach the payment provider" }, 502);
}

export function emailLooksValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}
