import { neon } from "@neondatabase/serverless";

export function databaseUrl() {
  return process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "";
}

export function databaseConfigured() {
  return Boolean(databaseUrl());
}

/** HTTP neon client — works from Node and Cloudflare Workers. */
export function sql() {
  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}
