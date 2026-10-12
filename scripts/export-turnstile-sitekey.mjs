#!/usr/bin/env node
/**
 * Print `export NEXT_PUBLIC_TURNSTILE_SITE_KEY=...` for eval, or no-op if already set.
 * Next.js inlines NEXT_PUBLIC_* at build time; wrangler.jsonc vars are runtime-only.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
  process.exit(0);
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const raw = readFileSync(resolve(root, "wrangler.jsonc"), "utf8");
const match = raw.match(/"NEXT_PUBLIC_TURNSTILE_SITE_KEY"\s*:\s*"([^"]+)"/);
if (!match?.[1]) {
  console.error(
    "WARN: NEXT_PUBLIC_TURNSTILE_SITE_KEY missing from env and wrangler.jsonc — Turnstile widget will not render.",
  );
  process.exit(0);
}
// Emit a line that the shell wrapper can eval.
process.stdout.write(`NEXT_PUBLIC_TURNSTILE_SITE_KEY=${match[1]}\n`);
