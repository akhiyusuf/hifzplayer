import { neon } from "@neondatabase/serverless";
import { SCHEMA_STATEMENTS } from "./schema.ts";

export function databaseUrl() {
  return process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "";
}

export function databaseConfigured() {
  return Boolean(databaseUrl());
}

let schemaPromise: Promise<void> | null = null;

/** Creates missing tables/columns once per isolate. You do not paste schema.sql into Neon. */
export function ensureSchema() {
  const url = databaseUrl();
  if (!url) return Promise.resolve();
  if (!schemaPromise) {
    schemaPromise = applySchema(url).catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}

async function applySchema(url: string) {
  const client = neon(url);
  for (const statement of SCHEMA_STATEMENTS) {
    await client.query(statement);
  }
}

/** HTTP neon client — works from Node and Cloudflare Workers. Applies schema first. */
export function sql() {
  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = neon(url);
  return ((strings: TemplateStringsArray, ...values: unknown[]) =>
    ensureSchema().then(() => client(strings, ...values))) as ReturnType<typeof neon>;
}
